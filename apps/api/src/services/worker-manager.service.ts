import { redis, redisSub } from '../config/redis.js';
import { WorkerHeartbeat, REDIS_CHANNELS, TaskDispatchPayload } from '@dm/shared';
import * as downloadService from './download.service.js';
import { detectProtocol, isBtProtocol } from '../utils/protocol.js';

export class WorkerManagerService {
  private static instance: WorkerManagerService;
  private workers: Map<string, WorkerHeartbeat> = new Map();

  private constructor() {
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
          this.workers.set(heartbeat.workerId, heartbeat);
          console.debug(`[WorkerManager] Heartbeat from ${heartbeat.workerId}`);
        } catch (err) {
          console.error('[WorkerManager] Failed to parse heartbeat:', err);
        }
      } else if (channel === REDIS_CHANNELS.TASKS_RECOVERY) {
        try {
          const { workerId } = JSON.parse(message);
          console.log(`[WorkerManager] Recovery request from ${workerId}`);
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

  private cleanup() {
    const now = Date.now();
    for (const [id, stats] of this.workers.entries()) {
      const lastSeen = new Date(stats.timestamp).getTime();
      if (now - lastSeen > 45000) { // 45 seconds timeout
        console.log(`[WorkerManager] Worker ${id} timed out`);
        this.workers.delete(id);
        void this.handleWorkerOffline(id);
      }
    }
  }

  private async handleWorkerOffline(workerId: string) {
    // 查找该 worker 名下的正在下载的任务，将其状态回退到 pending
    const tasks = await downloadService.getUnfinishedTasksByWorkerId(workerId);
    if (tasks.length === 0) return;

    console.log(`[WorkerManager] Worker ${workerId} offline, resetting ${tasks.length} tasks to pending`);
    
    for (const task of tasks) {
      if (task.status === 'downloading') {
        await downloadService.updateDownloadStatusInternal(task.id, 'pending');
      }
    }
  }

  getAvailableWorkers() {
    return Array.from(this.workers.values()).filter(w => w.status === 'online');
  }

  getBestWorker() {
    const available = this.getAvailableWorkers();
    if (available.length === 0) return null;

    // Simple strategy: pick worker with fewest active tasks
    return available.sort((a, b) => a.activeTasks - b.activeTasks)[0];
  }

  getWorker(workerId: string) {
    return this.workers.get(workerId);
  }
}

export const workerManager = WorkerManagerService.getInstance();
