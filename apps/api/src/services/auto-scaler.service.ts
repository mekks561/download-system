import { clusterController } from './cluster-controller.service.js';
import * as gmService from './gm.service.js';
import * as aiService from './ai.service.js';
import { workerManager } from './worker-manager.service.js';
import { storageBalancer } from './storage-balancer.service.js';
import { redis } from '../config/redis.js';

/**
 * 自动伸缩执行器 (Industrialization 2.0)
 * 对接 AI 流量预测建议，执行无人值守的集群扩缩容
 */
export class AutoScalerService {
  private static instance: AutoScalerService;
  private isAutoMode = false;
  private scalingInterval: NodeJS.Timeout | null = null;
  private balancingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new AutoScalerService();
    }
    return this.instance;
  }

  async setAutoMode(enabled: boolean) {
    this.isAutoMode = enabled;
    if (enabled) {
      if (!this.scalingInterval) {
        this.scalingInterval = setInterval(() => this.executeScalingPolicy(), 3600000); // 每小时执行一次 AI 决策
        void this.executeScalingPolicy(); // 立即执行一次
      }
      if (!this.balancingInterval) {
        this.balancingInterval = setInterval(() => this.executeBalancingPolicy(), 900000); // 每 15 分钟执行一次存储均衡
        void this.executeBalancingPolicy(); // 立即执行一次
      }
    } else {
      if (this.scalingInterval) {
        clearInterval(this.scalingInterval);
        this.scalingInterval = null;
      }
      if (this.balancingInterval) {
        clearInterval(this.balancingInterval);
        this.balancingInterval = null;
      }
    }
  }

  /** 执行 AI 伸缩决策 */
  private async executeScalingPolicy() {
    if (!this.isAutoMode) return;

    console.log('[AutoScaler] 正在执行 AI 无人值守伸缩决策...');
    
    try {
      const history = await gmService.getHourlyTrafficStats();
      const workers = workerManager.getAvailableWorkers();
      const prediction = await aiService.forecastTraffic(history, workers.length);

      if (!prediction || !prediction.recommendation) return;

      const { action, targetWorkerCount, reason } = prediction.recommendation;
      const currentCount = workers.length;

      if (action === 'scale_up' && currentCount < targetWorkerCount) {
        const diff = targetWorkerCount - currentCount;
        console.log(`[AutoScaler] AI 建议扩容 ${diff} 个节点。原因: ${reason}`);
        for (let i = 0; i < Math.min(diff, 3); i++) { // 单次最多扩容 3 个
          await clusterController.scaleUp();
        }
        await this.logAutonomousAction('scale_up', `自动扩容 ${diff} 个节点以应对流量高峰`);
      } else if (action === 'scale_down' && currentCount > targetWorkerCount) {
        const diff = currentCount - targetWorkerCount;
        console.log(`[AutoScaler] AI 建议缩容 ${diff} 个节点。原因: ${reason}`);
        for (let i = 0; i < diff; i++) {
          await clusterController.scaleDown();
        }
        await this.logAutonomousAction('scale_down', `自动缩容 ${diff} 个节点以优化资源利用率`);
      } else {
        console.log('[AutoScaler] 集群状态健康，无需调整');
      }
    } catch (err) {
      console.error('[AutoScaler] 决策执行失败:', err);
    }
  }

  /** 执行存储均衡决策 */
  private async executeBalancingPolicy() {
    if (!this.isAutoMode) return;

    console.log('[AutoScaler] 正在执行集群存储均衡检查...');
    try {
      const affected = await storageBalancer.runBalancingCheck();
      if (affected > 0) {
        await this.logAutonomousAction('balancing', `自动触发跨节点存储均衡，启动 ${affected} 个大文件迁移任务`);
      }
    } catch (err) {
      console.error('[AutoScaler] 存储均衡执行失败:', err);
    }
  }

  private async logAutonomousAction(type: string, message: string) {
    const log = {
      timestamp: new Date().toISOString(),
      type,
      message,
      module: 'AutoScaler'
    };
    await redis.lpush('autonomous:logs', JSON.stringify(log));
    await redis.ltrim('autonomous:logs', 0, 99); // 只保留最近 100 条
  }

  getAutoMode() {
    return this.isAutoMode;
  }
}

export const autoScaler = AutoScalerService.getInstance();
