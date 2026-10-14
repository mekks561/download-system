import { redis, redisSub } from '../config/redis.js';
import { WorkerHeartbeat, REDIS_CHANNELS } from '@dm/shared';

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
    // Subscribe to heartbeats
    redisSub.subscribe(REDIS_CHANNELS.WORKER_HEARTBEAT, (err) => {
      if (err) console.error('[WorkerManager] Redis sub error:', err);
    });

    redisSub.on('message', (channel, message) => {
      if (channel === REDIS_CHANNELS.WORKER_HEARTBEAT) {
        try {
          const heartbeat = JSON.parse(message) as WorkerHeartbeat;
          this.workers.set(heartbeat.workerId, heartbeat);
          console.debug(`[WorkerManager] Heartbeat from ${heartbeat.workerId}`);
        } catch (err) {
          console.error('[WorkerManager] Failed to parse heartbeat:', err);
        }
      }
    });

    // Cleanup stale workers every 10 seconds
    setInterval(() => this.cleanup(), 10000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, stats] of this.workers.entries()) {
      const lastSeen = new Date(stats.timestamp).getTime();
      if (now - lastSeen > 45000) { // 45 seconds timeout
        console.log(`[WorkerManager] Worker ${id} timed out`);
        this.workers.delete(id);
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
