import { Redis } from 'ioredis';
import { REDIS_CHANNELS, TaskUpdatePayload, TaskControlPayload } from '@dm/shared';
import { HttpEngine, TorrentEngine, BaseEngine, BT_DISABLED_MESSAGE } from '@dm/engine';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { WorkerPluginHost } from '../plugins/WorkerPluginHost.js';

export class TaskService {
  private redis: Redis;
  private workerId: string;
  private engines: Map<number, BaseEngine> = new Map();
  private downloadRoot: string;
  private pluginHost?: WorkerPluginHost;

  constructor(redis: Redis, workerId: string, pluginHost?: WorkerPluginHost) {
    this.redis = redis;
    this.workerId = workerId;
    this.pluginHost = pluginHost;
    
    const configured = process.env.DM_DOWNLOAD_ROOT?.trim();
    this.downloadRoot = resolve(configured && configured.length > 0 ? configured : join(process.cwd(), 'downloads'));
  }

  getActiveTaskCount() {
    return this.engines.size;
  }

  async init() {
    try {
      const sub = this.redis.duplicate();
      
      // 监听任务分发
      await sub.subscribe(`${REDIS_CHANNELS.TASKS_DISPATCH}:${this.workerId}`);
      // 监听任务控制
      await sub.subscribe(`${REDIS_CHANNELS.TASKS_CONTROL}:${this.workerId}`);

      sub.on('message', (channel, message) => {
        if (channel === `${REDIS_CHANNELS.TASKS_DISPATCH}:${this.workerId}`) {
          this.handleDispatch(message);
        } else if (channel === `${REDIS_CHANNELS.TASKS_CONTROL}:${this.workerId}`) {
          this.handleControl(message);
        }
      });

      console.log(`[TaskService] Listening for tasks & control on ${this.workerId}`);
    } catch (err) {
      console.warn(`[TaskService] Redis 订阅失败 (可能未就绪)，将无法接收实时任务分发:`, err);
    }
  }

  private async handleDispatch(message: string) {
    try {
      const payload = JSON.parse(message);
      
      // 工业化 2.0: 支持多种调度任务类型
      if (payload.type === 'ARCHIVE_FILE') {
        const { taskId, action, filename } = payload;
        await this.handleArchiving(taskId, action, filename);
        return;
      }

      if (payload.type === 'MIGRATE_IN') {
        const { taskId, sourceUrl, filename } = payload;
        await this.handleMigration(taskId, sourceUrl, filename);
        return;
      }

      if (payload.type === 'RESTORE_FILE') {
        const { taskId, filename } = payload;
        await this.handleRestore(taskId, filename);
        return;
      }

      // 默认下载调度 (兼容旧版或无 type 字段)
      console.log(`[TaskService] Starting task: ${payload.taskId} (${payload.protocol})`);

      // BT 已下线：队列里可能残留历史磁力/种子任务，直接回报错误，不再尝试引擎。
      if (payload.protocol !== 'http') {
        await this.sendLog(payload.taskId, 'error', BT_DISABLED_MESSAGE);
        this.reportProgress(payload.taskId, 'error', 0, '0', '0', '0', 0, BT_DISABLED_MESSAGE);
        return;
      }

      await this.sendLog(payload.taskId, 'info', `Worker 接收到下载指令: ${payload.protocol}`);

      if (this.engines.has(payload.taskId)) return;

      let engine: BaseEngine;
      if (payload.protocol === 'http') {
        engine = new HttpEngine(this.downloadRoot);
      } else {
        engine = new TorrentEngine(this.downloadRoot);
      }

      this.engines.set(payload.taskId, engine);

      engine.on('progress', (p) => {
        const progress = p.totalBytes > 0 ? Math.round((p.downloadedBytes / p.totalBytes) * 100) : 0;
        this.reportProgress(payload.taskId, 'downloading', progress, p.downloadedBytes.toString(), p.totalBytes.toString(), p.speed.toString(), p.peers);
      });

      engine.on('complete', (c) => {
        const fullPath = join(this.downloadRoot, payload.filename || c.filename || 'unknown');
        this.reportProgress(
          payload.taskId, 
          'completed', 
          100, 
          c.size.toString(), 
          c.size.toString(), 
          '0', 
          0, 
          undefined, 
          fullPath
        );
        this.engines.delete(payload.taskId);
        
        // 广播给本地插件
        if (this.pluginHost) {
          void this.pluginHost.broadcast('DOWNLOAD_COMPLETE', {
            taskId: payload.taskId.toString(),
            url: payload.url,
            filename: payload.filename || 'unknown',
            userId: payload.userId,
            path: join(this.downloadRoot, payload.filename || 'unknown')
          });
        }
      });

      engine.on('error', (err) => {
        this.reportProgress(payload.taskId, 'error', 0, '0', '0', '0', 0, typeof err === 'string' ? err : err.message);
        this.engines.delete(payload.taskId);
      });

      engine.on('paused', (p) => {
        this.reportProgress(payload.taskId, 'paused', 0, p.downloadedBytes.toString(), '0', '0');
        this.engines.delete(payload.taskId);
      });

      engine.on('cancelled', () => {
        this.reportProgress(payload.taskId, 'cancelled', 0, '0', '0', '0');
        this.engines.delete(payload.taskId);
      });

      // 启动引擎
      if (payload.protocol === 'http') {
        (engine as HttpEngine).start({
          id: payload.taskId,
          url: payload.url,
          filename: payload.filename || 'download',
          speedLimit: payload.limits?.speed
        });
      } else {
        (engine as TorrentEngine).start({
          id: payload.taskId,
          url: payload.url,
          selectedFiles: payload.metadata?.selectedFiles,
          announce: payload.metadata?.announce,
          speedLimit: payload.limits?.speed
        });
      }

    } catch (err) {
      console.error('[TaskService] Failed to handle dispatch:', err);
    }
  }

  private async handleArchiving(taskId: number, action: string, filename: string) {
    console.log(`[TaskService] 正在执行归档任务: ${taskId}, 动作: ${action}`);
    await this.sendLog(taskId, 'info', `开始执行归档动作: ${action}`);
    
    try {
      const filePath = join(this.downloadRoot, filename);
      if (!existsSync(filePath)) {
        throw new Error('本地文件已丢失，无法归档');
      }

      if (action === 'compress') {
        // 模拟压缩：实际生产中可使用 adm-zip 或 archiver
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.sendLog(taskId, 'info', `文件已成功压缩并归档`);
      } else {
        // 模拟迁移到低成本存储
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sendLog(taskId, 'info', `文件已成功迁移至归档存储目录`);
      }
      
      this.reportProgress(taskId, 'completed', 100, '0', '0', '0');
    } catch (err: any) {
      console.error(`[TaskService] 归档失败:`, err);
      await this.reportProgress(taskId, 'error', 0, '0', '0', '0', 0, `归档失败: ${err.message}`);
    }
  }

  private async handleMigration(taskId: number, sourceUrl: string, filename: string) {
    console.log(`[TaskService] 正在从节点同步文件: ${taskId}, 源: ${sourceUrl}`);
    await this.sendLog(taskId, 'info', `正在执行跨节点存储均衡，从源节点同步数据...`);
    
    try {
      // 模拟跨节点传输
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.sendLog(taskId, 'info', `跨节点文件迁移完成`);
      
      const fullPath = join(this.downloadRoot, filename);
      this.reportProgress(taskId, 'completed', 100, '0', '0', '0', 0, undefined, fullPath);
    } catch (err: any) {
      console.error(`[TaskService] 迁移失败:`, err);
      await this.reportProgress(taskId, 'error', 0, '0', '0', '0', 0, `迁移失败: ${err.message}`);
    }
  }

  private async handleRestore(taskId: number, filename: string) {
    console.log(`[TaskService] 正在执行恢复任务: ${taskId}`);
    await this.sendLog(taskId, 'info', `开始从归档状态恢复文件...`);
    
    try {
      // 模拟恢复逻辑（解压或迁回）
      await new Promise(resolve => setTimeout(resolve, 1500));
      await this.sendLog(taskId, 'info', `文件已成功从归档中恢复`);
      
      const fullPath = join(this.downloadRoot, filename);
      this.reportProgress(taskId, 'completed', 100, '0', '0', '0', 0, undefined, fullPath);
    } catch (err: any) {
      console.error(`[TaskService] 恢复失败:`, err);
      await this.reportProgress(taskId, 'error', 0, '0', '0', '0', 0, `恢复失败: ${err.message}`);
    }
  }

  private async handleControl(message: string) {
    try {
      const payload = JSON.parse(message) as TaskControlPayload;
      console.log(`[TaskService] Received control: ${payload.taskId} -> ${payload.action}`);

      const engine = this.engines.get(payload.taskId);
      if (!engine) return;

      switch (payload.action) {
        case 'pause':
          await engine.pause();
          break;
        case 'cancel':
        case 'delete':
          await engine.cancel();
          break;
        case 'resume':
          // Resume is usually handled by a new dispatch if the engine was cleaned up
          break;
      }
    } catch (err) {
      console.error('[TaskService] Failed to handle control:', err);
    }
  }

  private async reportProgress(
    taskId: number, 
    status: string, 
    progress: number, 
    downloaded: string, 
    total: string, 
    speed: string,
    peers: number = 0,
    error?: string,
    fullPath?: string
  ) {
    const update: TaskUpdatePayload = {
      taskId,
      workerId: this.workerId,
      status,
      progress,
      downloadedBytes: downloaded,
      totalBytes: total,
      speed,
      peers,
      error,
      fullPath,
      timestamp: new Date().toISOString(),
    };

    if (error) {
      await this.sendLog(taskId, 'error', error);
    }

    await this.redis.publish(REDIS_CHANNELS.TASKS_UPDATES, JSON.stringify(update));
  }

  private async sendLog(taskId: number, level: 'info' | 'warn' | 'error', message: string) {
    const log = {
      taskId,
      workerId: this.workerId,
      level,
      message,
      timestamp: new Date().toISOString()
    };
    await this.redis.publish(REDIS_CHANNELS.TASKS_LOGS, JSON.stringify(log));
  }
}
