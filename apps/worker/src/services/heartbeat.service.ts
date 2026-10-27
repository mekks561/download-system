import { Redis } from 'ioredis';
import os from 'os';
import diskusage from 'diskusage';
import { WorkerHeartbeat, REDIS_CHANNELS, WORKER_TTL } from '@dm/shared';
import { TaskService } from './task.service.js';

export class HeartbeatService {
  private redis: Redis;
  private workerId: string;
  private taskService: TaskService;
  private interval: NodeJS.Timeout | null = null;

  constructor(redis: Redis, workerId: string, taskService: TaskService) {
    this.redis = redis;
    this.workerId = workerId;
    this.taskService = taskService;
  }

  async start() {
    console.log(`[Heartbeat] Starting for worker: ${this.workerId}`);
    
    // Initial heartbeat
    await this.sendHeartbeat();

    // 发送恢复请求：告知 Master 本节点已启动，请重新同步未完成任务
    try {
      await this.redis.publish(REDIS_CHANNELS.TASKS_RECOVERY, JSON.stringify({
        workerId: this.workerId,
        timestamp: new Date().toISOString()
      }));
      console.log(`[Heartbeat] Sent recovery request for ${this.workerId}`);
    } catch (err) {
      console.warn(`[Heartbeat] 无法发送恢复请求 (Redis 可能未就绪):`, err);
    }

    // Set interval for periodic heartbeat
    this.interval = setInterval(() => {
      this.sendHeartbeat().catch(err => {
        console.error('[Heartbeat] Error sending heartbeat:', err);
      });
    }, (WORKER_TTL / 2) * 1000); // Send every 15 seconds if TTL is 30
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async sendHeartbeat() {
    try {
      const disk = await diskusage.check(process.cwd()); // Simplified for now
      
      // 获取本机 IP
      const networkInterfaces = os.networkInterfaces();
      let ip = 'localhost';
      for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        if (interfaces) {
          for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
              ip = iface.address;
              break;
            }
          }
        }
        if (ip !== 'localhost') break;
      }

      const heartbeat: WorkerHeartbeat = {
        workerId: this.workerId,
        status: 'online',
        region: process.env.REGION || 'default', // 读取环境变量，默认为 default
        ip,
        port: parseInt(process.env.INTERNAL_PORT || '5002', 10),
        cpuUsage: os.loadavg()[0],
        memoryUsage: {
          total: os.totalmem(),
          free: os.freemem(),
        },
        diskUsage: {
          total: disk.total,
          available: disk.available,
      },
      activeTasks: this.taskService.getActiveTaskCount(),
      timestamp: new Date().toISOString(),
    };

      // Store in Redis with TTL for presence detection
      await this.redis.set(
        `worker:presence:${this.workerId}`,
        JSON.stringify(heartbeat),
        'EX',
        WORKER_TTL
      );

      // Also publish to channel for real-time monitoring
      await this.redis.publish(REDIS_CHANNELS.WORKER_HEARTBEAT, JSON.stringify(heartbeat));
      
      console.debug(`[Heartbeat] Sent for ${this.workerId}`);
    } catch (error) {
      console.error('[Heartbeat] Failed to gather system stats:', error);
    }
  }
}
