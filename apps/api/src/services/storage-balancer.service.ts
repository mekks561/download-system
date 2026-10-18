import { workerManager } from './worker-manager.service.js';
import * as downloadService from './download.service.js';
import { redis } from '../config/redis.js';
import { REDIS_CHANNELS } from '@dm/shared';
import { prisma } from '../config/prisma.js';

/**
 * 跨节点存储均衡引擎 (Industrialization 2.0)
 * 负责在节点间自动平衡存储水位，防止单点溢出
 */
export class StorageBalancerService {
  private static instance: StorageBalancerService;
  private isBalancing = false;

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new StorageBalancerService();
    }
    return this.instance;
  }

  /** 执行全局均衡检查 */
  async runBalancingCheck(): Promise<number> {
    if (this.isBalancing) return 0;
    this.isBalancing = true;
    let migrationCount = 0;

    try {
      const workers = workerManager.getAvailableWorkers();
      if (workers.length < 2) return 0;

      // 1. 识别高水位节点 (> 85% 占用)
      const overloaded = workers.filter(w => {
        const total = w.diskUsage.available + 1024 * 1024 * 1024 * 10; // 模拟总空间
        const used = total - w.diskUsage.available;
        return (used / total) > 0.85;
      });

      // 2. 识别低水位节点 (< 40% 占用)
      const underloaded = workers.filter(w => {
        const total = w.diskUsage.available + 1024 * 1024 * 1024 * 10;
        const used = total - w.diskUsage.available;
        return (used / total) < 0.4;
      }).sort((a, b) => b.diskUsage.available - a.diskUsage.available);

      if (overloaded.length > 0 && underloaded.length > 0) {
        for (const source of overloaded) {
          const target = underloaded[0];
          migrationCount += await this.migrateHotFiles(source.workerId, target.workerId);
        }
      }
    } finally {
      this.isBalancing = false;
    }
    return migrationCount;
  }

  /** 将大文件从源节点迁移到目标节点 */
  private async migrateHotFiles(sourceId: string, targetId: string): Promise<number> {
    // 查找源节点上最大的 3 个已完成任务
    // MariaDB 不支持 Prisma 的 Json path 数组过滤：多拉一些候选再在内存过滤
    const candidates = await prisma.download.findMany({
      where: { status: 'completed' },
      orderBy: { totalBytes: 'desc' },
      take: 100
    });
    const tasks = candidates
      .filter(
        t => (t.metadata as Record<string, unknown> | null)?.workerId === sourceId
      )
      .slice(0, 3);

    let count = 0;
    for (const task of tasks) {
      console.log(`[StorageBalancer] 正在执行跨节点迁移: ${task.filename} (${sourceId} -> ${targetId})`);
      
      // 触发跨节点迁移指令
      await redis.publish(`${REDIS_CHANNELS.TASKS_DISPATCH}:${targetId}`, JSON.stringify({
        type: 'MIGRATE_IN',
        taskId: task.id,
        sourceWorkerId: sourceId,
        sourceUrl: `http://${workerManager.getWorker(sourceId)?.ip}:${workerManager.getWorker(sourceId)?.port}/internal/download/${task.id}`
      }));

      // 更新任务元数据中的期望位置
      const metadata = (task.metadata as any) || {};
      metadata.migratingTo = targetId;
      await downloadService.updateDownloadMetadataInternal(task.id, metadata);
      count++;
    }
    return count;
  }
}

export const storageBalancer = StorageBalancerService.getInstance();
