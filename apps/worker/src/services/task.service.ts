import Redis from 'ioredis';
import { TaskDispatchPayload, REDIS_CHANNELS, TaskUpdatePayload, TaskControlPayload } from '@dm/shared';
import { HttpEngine, TorrentEngine, BaseEngine } from '@dm/engine';
import { resolve, join } from 'node:path';

export class TaskService {
  private redis: Redis;
  private workerId: string;
  private engines: Map<number, BaseEngine> = new Map();
  private downloadRoot: string;

  constructor(redis: Redis, workerId: string) {
    this.redis = redis;
    this.workerId = workerId;
    
    const configured = process.env.DM_DOWNLOAD_ROOT?.trim();
    this.downloadRoot = resolve(configured && configured.length > 0 ? configured : join(process.cwd(), 'downloads'));
  }

  getActiveTaskCount() {
    return this.engines.size;
  }

  async init() {
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
  }

  private async handleDispatch(message: string) {
    try {
      const payload = JSON.parse(message) as TaskDispatchPayload;
      console.log(`[TaskService] Starting task: ${payload.taskId} (${payload.protocol})`);

      if (this.engines.has(payload.taskId)) return;

      let engine: BaseEngine;
      if (payload.protocol === 'http') {
        engine = new HttpEngine(this.downloadRoot);
      } else {
        engine = new TorrentEngine(this.downloadRoot);
      }

      this.engines.set(payload.taskId, engine);

      engine.on('progress', (p) => {
        this.reportProgress(payload.taskId, 'downloading', p.progress, p.downloadedBytes.toString(), p.totalBytes.toString(), p.speed.toString(), p.peers);
      });

      engine.on('complete', (c) => {
        this.reportProgress(payload.taskId, 'completed', 100, c.size.toString(), c.size.toString(), '0');
        this.engines.delete(payload.taskId);
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
    error?: string
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
      timestamp: new Date().toISOString(),
    };

    await this.redis.publish(REDIS_CHANNELS.TASKS_UPDATES, JSON.stringify(update));
  }
}
