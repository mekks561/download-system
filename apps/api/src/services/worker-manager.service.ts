import { redis, redisSub } from '../config/redis.js';
import { WorkerHeartbeat, REDIS_CHANNELS, TaskDispatchPayload } from '@dm/shared';
import * as downloadService from './download.service.js';
import { detectProtocol, isBtProtocol } from '../utils/protocol.js';
import { EventEmitter } from 'node:events';

import * as aiService from './ai.service.js';

export class WorkerManagerService extends EventEmitter {
  private static instance: WorkerManagerService;
  private workers: Map<string, WorkerHeartbeat> = new Map();

  private constructor() {
    super();
    this.init();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new WorkerManagerService();
    }
    return this.instance;
  }

  private init() {
    // Subscribe to heartbeats and recovery requests
    redisSub.subscribe(REDIS_CHANNELS.WORKER_HEARTBEAT, REDIS_CHANNELS.TASKS_RECOVERY, (err) => {
      if (err) console.error('[WorkerManager] Redis sub error:', err);
    });

    redisSub.on('message', async (channel, message) => {
      if (channel === REDIS_CHANNELS.WORKER_HEARTBEAT) {
        try {
          const heartbeat = JSON.parse(message) as WorkerHeartbeat;
          const isNew = !this.workers.has(heartbeat.workerId);
          this.workers.set(heartbeat.workerId, heartbeat);
          console.debug(`[WorkerManager] Heartbeat from ${heartbeat.workerId}`);
          
          if (isNew) {
            console.log(`[WorkerManager] New worker online: ${heartbeat.workerId}`);
            this.emit('worker_online', heartbeat.workerId);
          }
        } catch (err) {
          console.error('[WorkerManager] Failed to parse heartbeat:', err);
        }
      } else if (channel === REDIS_CHANNELS.TASKS_RECOVERY) {
        try {
          const { workerId } = JSON.parse(message);
          console.log(`[WorkerManager] Recovery request from ${workerId}`);
          this.emit('worker_recovery', workerId);
          await this.handleRecovery(workerId);
        } catch (err) {
          console.error('[WorkerManager] Failed to handle recovery:', err);
        }
      }
    });

    // Cleanup stale workers every 10 seconds
    setInterval(() => this.cleanup(), 10000);
  }

  private async handleRecovery(workerId: string) {
    const tasks = await downloadService.getUnfinishedTasksByWorkerId(workerId);
    console.log(`[WorkerManager] Recovering ${tasks.length} tasks for ${workerId}`);

    for (const task of tasks) {
      const protocol = detectProtocol(task.url);
      const payload: TaskDispatchPayload = {
        taskId: task.id,
        userId: task.userId,
        url: task.url,
        protocol: isBtProtocol(protocol) ? (protocol === 'magnet' ? 'magnet' : 'torrent') : 'http',
        filename: task.filename || undefined,
        metadata: task.metadata
      };

      await redis.publish(`${REDIS_CHANNELS.TASKS_DISPATCH}:${workerId}`, JSON.stringify(payload));
    }
  }

  private isCleaning = false;

  private cleanup() {
    if (this.isCleaning) return;
    this.isCleaning = true;

    try {
      const now = Date.now();
      for (const [id, stats] of this.workers.entries()) {
        const lastSeen = new Date(stats.timestamp).getTime();
        if (now - lastSeen > 45000) { // 45 seconds timeout
          console.log(`[WorkerManager] Worker ${id} timed out`);
          this.workers.delete(id);
          void this.handleWorkerOffline(id);
        }
      }
    } finally {
      this.isCleaning = false;
    }
  }

  private async handleWorkerOffline(workerId: string) {
    // 查找该 worker 名下的正在下载的任务，将其状态回退到 pending，并清除绑定信息以触发 Failover
    const tasks = await downloadService.getUnfinishedTasksByWorkerId(workerId);
    if (tasks.length === 0) return;

    console.log(`[WorkerManager] Worker ${workerId} offline, resetting ${tasks.length} tasks and triggering failover`);
    
    for (const task of tasks) {
      // 1. 清除元数据中的 workerId 绑定
      const metadata = (task.metadata as any) || {};
      delete metadata.workerId;
      await downloadService.updateDownloadMetadataInternal(task.id, metadata);

      // 2. 将正在下载的任务回退到 pending
      if (task.status === 'downloading') {
        await downloadService.updateDownloadStatusInternal(task.id, 'pending');
      }

      // 3. 触发 Failover 事件，供 DownloadManager 捕获并重调度
      this.emit('worker_offline_failover', { taskId: task.id, userId: task.userId });
    }
  }

  getAvailableWorkers() {
    return Array.from(this.workers.values()).filter(w => w.status === 'online');
  }

  async getBestWorker(url?: string) {
    const available = this.getAvailableWorkers();
    if (available.length === 0) return null;

    // 工业化调度策略：基于负载、存储权重及 AI 地域偏好的加权评分
    const MIN_DISK_AVAILABLE = 1024 * 1024 * 1024; // 1GB 最小预留空间
    
    // AI 地域偏好
    let preferredRegion: string | null = null;
    if (url) {
      const suggestion = await aiService.suggestBestRegion(url);
      if (suggestion && suggestion.confidence > 0.6) {
        preferredRegion = suggestion.recommendedRegion;
        console.log(`[WorkerManager] AI 建议地域: ${preferredRegion} (原因: ${suggestion.reason})`);
      }
    }

    const scored = available
      .filter(w => w.diskUsage.available > MIN_DISK_AVAILABLE) // 过滤空间不足的节点
      .map(w => {
        // 归一化评分 (越小越好)
        // 1. 任务数权重 0.4
        const taskScore = w.activeTasks * 0.4;
        // 2. CPU 负载权重 0.2
        const cpuScore = w.cpuUsage * 0.2;
        // 3. 内存压力权重 0.1
        const memPressure = (1 - w.memoryUsage.free / w.memoryUsage.total) * 0.1;
        // 4. 地域权重 0.3 (如果不是首选地域，惩罚分增加)
        let regionPenalty = 0;
        if (preferredRegion && w.region !== preferredRegion) {
          regionPenalty = 10; // 显著增加非首选地域的得分，使其优先级降低
        }
        
        return { worker: w, score: taskScore + cpuScore + memPressure + regionPenalty };
      });

    if (scored.length === 0) {
      // 如果都空间不足，退而求其次选择空间最大的
      return available.sort((a, b) => b.diskUsage.available - a.diskUsage.available)[0];
    }

    return scored.sort((a, b) => a.score - b.score)[0].worker;
  }

  getWorker(workerId: string) {
    return this.workers.get(workerId);
  }
}

export const workerManager = WorkerManagerService.getInstance();
