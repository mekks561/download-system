import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { redis } from '../config/redis.js';
import { REDIS_CHANNELS } from '@dm/shared';

/**
 * 集群控制器：负责 Worker 进程的动态生命周期管理 (Industrialization 2.0)
 * 在 monorepo 模拟环境下，通过 child_process 启停本地 Worker 实例
 */
export class ClusterControllerService {
  private static instance: ClusterControllerService;
  private managedWorkers: Map<string, ChildProcess> = new Map();
  private basePort = 5100;

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new ClusterControllerService();
    }
    return this.instance;
  }

  /** 启动一个新的 Worker 节点 */
  async scaleUp(): Promise<string> {
    const workerId = `worker-auto-${Math.random().toString(36).substring(7)}`;
    const port = this.basePort + this.managedWorkers.size;
    
    console.log(`[ClusterController] 正在扩容新节点: ${workerId} (Port: ${port})`);

    const workerProcess = spawn('pnpm', ['--filter', 'worker', 'start'], {
      cwd: path.resolve(process.cwd(), '../..'), // Monorepo 根目录
      env: {
        ...process.env,
        PORT: port.toString(),
        WORKER_ID: workerId,
        INTERNAL_SECRET: process.env.INTERNAL_SECRET || 'default-secret',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
      },
      stdio: 'inherit',
      shell: true
    });

    this.managedWorkers.set(workerId, workerProcess);

    workerProcess.on('exit', (code) => {
      console.log(`[ClusterController] Worker ${workerId} 已退出，代码: ${code}`);
      this.managedWorkers.delete(workerId);
    });

    return workerId;
  }

  /** 停止指定的 Worker 节点 */
  async scaleDown(workerId?: string): Promise<boolean> {
    let targetId = workerId;
    
    // 如果未指定，选择最近启动的一个自动扩展节点
    if (!targetId) {
      const autoWorkers = Array.from(this.managedWorkers.keys()).filter(id => id.startsWith('worker-auto-'));
      if (autoWorkers.length === 0) return false;
      targetId = autoWorkers[autoWorkers.length - 1];
    }

    const process = this.managedWorkers.get(targetId);
    if (!process) {
      // 如果不是由 Controller 直接管理的，尝试发送 Redis 指令通知其优雅停机
      console.log(`[ClusterController] 发送优雅停机指令给外部 Worker: ${targetId}`);
      await redis.publish(`${REDIS_CHANNELS.TASKS_DISPATCH}:${targetId}`, JSON.stringify({
        type: 'SHUTDOWN',
        graceful: true
      }));
      return true;
    }

    console.log(`[ClusterController] 正在缩容节点: ${targetId}`);
    process.kill('SIGTERM');
    return true;
  }

  getManagedWorkerCount() {
    return this.managedWorkers.size;
  }
}

export const clusterController = ClusterControllerService.getInstance();
