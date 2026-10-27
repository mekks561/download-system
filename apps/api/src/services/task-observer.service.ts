import { redisSub } from '../config/redis.js';
import { REDIS_CHANNELS, TaskUpdatePayload } from '@dm/shared';
import { emitDownloadProgress, emitDownloadComplete, emitDownloadFailed, emitSystemLog } from '../config/socket.js';
import * as downloadService from './download.service.js';
import * as aiService from './ai.service.js';
import { pluginHost } from '../config/plugin-host.js';
import { autoHealing } from './auto-healing.service.js';

export class TaskObserverService {
  private static instance: TaskObserverService;
  private logBuffer: any[] = [];
  private readonly MAX_LOGS = 200;

  private constructor() {
    this.init();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new TaskObserverService();
    }
    return this.instance;
  }

  getLogs() {
    return this.logBuffer;
  }

  private init() {
    redisSub.subscribe(REDIS_CHANNELS.TASKS_UPDATES, REDIS_CHANNELS.TASKS_LOGS, (err: Error | null | undefined) => {
      if (err) console.error('[TaskObserver] Redis sub error:', err);
    });

    redisSub.on('message', async (channel: string, message: string) => {
      try {
        if (channel === REDIS_CHANNELS.TASKS_UPDATES) {
          const update = JSON.parse(message) as TaskUpdatePayload;
          await this.handleUpdate(update);
        } else if (channel === REDIS_CHANNELS.TASKS_LOGS) {
          const log = JSON.parse(message);
          this.handleLog(log);
        }
      } catch (err) {
        console.error(`[TaskObserver] Failed to process ${channel}:`, err);
      }
    });
  }

  private handleLog(log: any) {
    // 工业化特性：集中日志处理
    // 在生产环境下可以写入专门的日志表或推送给 ELK
    const { taskId, workerId, level, message, timestamp } = log;
    console.log(`[TaskLog][${workerId}][Task:${taskId}][${level.toUpperCase()}] ${message} (${timestamp})`);
    
    // 存入内存缓冲供 GM 后台查看
    this.logBuffer.unshift(log);
    if (this.logBuffer.length > this.MAX_LOGS) {
      this.logBuffer.pop();
    }
    
    // 实时广播给在线的管理员
    emitSystemLog(log);
  }

  private async handleUpdate(update: TaskUpdatePayload) {
    const download = await downloadService.getDownloadByIdSimple(update.taskId);
    if (!download) return;

    const userId = download.userId;

    // 1. 插件生命周期自动化触发
    if (update.status === 'completed') {
      void pluginHost.broadcast('DOWNLOAD_COMPLETE', {
        taskId: update.taskId.toString(),
        url: download.url,
        filename: download.filename || 'unknown',
        userId,
        path: download.filename, // 这里的路径可能需要 Worker 信息，暂时用文件名
        workerId: update.workerId
      });
    } else if (update.status === 'error') {
      void pluginHost.broadcast('DOWNLOAD_ERROR', {
        taskId: update.taskId.toString(),
        url: download.url,
        userId,
        error: update.error || 'Unknown error'
      });
    }

    // 2. 实时推送与数据库更新
    if (update.status === 'completed') {
      emitDownloadComplete(userId, update.taskId, download.filename || 'unknown');
      
      const metadataUpdate: any = {};
      if (update.fullPath) {
        metadataUpdate.fullPath = update.fullPath;
      }
      
      await Promise.all([
        downloadService.updateDownloadStatusInternal(update.taskId, 'completed'),
        Object.keys(metadataUpdate).length > 0 
          ? downloadService.updateDownloadMetadataInternal(update.taskId, metadataUpdate)
          : Promise.resolve()
      ]);
      
      // 3. 异步增强处理 (向量嵌入 + AI 分类)
      void (async () => {
        try {
          const textToEmbed = `${download.filename} ${download.url}`;
          
          // 并行执行 AI 任务以提升效率
          const [embedding, classification] = await Promise.all([
            aiService.generateEmbedding(textToEmbed),
            aiService.classifyFile(download.filename || 'unknown', download.url)
          ]);

          const metadataUpdate: any = {};
          
          if (embedding) {
            metadataUpdate.embedding = embedding;
            metadataUpdate.embeddedAt = new Date().toISOString();
          }

          if (classification) {
            metadataUpdate.aiCategory = classification.categoryId;
            metadataUpdate.aiPriority = classification.priority;
            metadataUpdate.aiReason = classification.reason;
            metadataUpdate.classifiedAt = new Date().toISOString();
            console.log(`[TaskObserver] AI 分类成功: ${update.taskId} -> ${classification.categoryId}`);
          }

          if (Object.keys(metadataUpdate).length > 0) {
            await downloadService.updateDownloadMetadataInternal(update.taskId, metadataUpdate);
          }
        } catch (err) {
          console.error('[TaskObserver] AI 异步处理失败:', err);
        }
      })();
    } else if (update.status === 'error') {
      emitDownloadFailed(userId, update.taskId, update.error || 'Unknown error');
      await downloadService.updateDownloadStatusInternal(update.taskId, 'error');
      
      // 4. 触发 AI 自动修复引擎
      void autoHealing.handleError(update.taskId, update.error || 'Unknown error');
    } else {
      const speedValue = parseFloat(update.speed) || 0;
      emitDownloadProgress(
        userId,
        update.taskId,
        update.progress,
        update.status,
        speedValue,
        update.peers
      );
    }
  }
}

export const taskObserver = TaskObserverService.getInstance();
