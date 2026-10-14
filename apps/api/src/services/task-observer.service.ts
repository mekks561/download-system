import { redisSub } from '../config/redis.js';
import { REDIS_CHANNELS, TaskUpdatePayload } from '@dm/shared';
import { emitDownloadProgress, emitDownloadComplete, emitDownloadFailed } from '../config/socket.js';
import * as downloadService from './download.service.js';
import { pluginHost } from '../config/plugin-host.js';

export class TaskObserverService {
  private static instance: TaskObserverService;

  private constructor() {
    this.init();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new TaskObserverService();
    }
    return this.instance;
  }

  private init() {
    redisSub.subscribe(REDIS_CHANNELS.TASKS_UPDATES, (err) => {
      if (err) console.error('[TaskObserver] Redis sub error:', err);
    });

    redisSub.on('message', async (channel, message) => {
      if (channel === REDIS_CHANNELS.TASKS_UPDATES) {
        try {
          const update = JSON.parse(message) as TaskUpdatePayload;
          await this.handleUpdate(update);
        } catch (err) {
          console.error('[TaskObserver] Failed to parse update:', err);
        }
      }
    });
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
      await downloadService.updateDownloadStatusInternal(update.taskId, 'completed');
    } else if (update.status === 'error') {
      emitDownloadFailed(userId, update.taskId, update.error || 'Unknown error');
      await downloadService.updateDownloadStatusInternal(update.taskId, 'error');
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
