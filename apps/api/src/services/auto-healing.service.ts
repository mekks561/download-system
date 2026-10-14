import * as aiService from './ai.service';
import * as downloadService from './download.service';
import { redis } from '../config/redis';
import { REDIS_CHANNELS, TaskDispatchPayload } from '@dm/shared';
import { detectProtocol, isBtProtocol } from '../utils/protocol.js';
import { workerManager } from './worker-manager.service.js';

export class AutoHealingService {
  private static instance: AutoHealingService;

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new AutoHealingService();
    }
    return this.instance;
  }

  async handleError(taskId: number, errorMsg: string) {
    const download = await downloadService.getDownloadByIdSimple(taskId);
    if (!download) return;

    const metadata = (download.metadata as any) || {};
    const retryCount = (metadata.healingRetryCount || 0);

    if (retryCount >= 3) {
      console.warn(`[AutoHealing] 任务 ${taskId} 已达到最大自动修复次数 (${retryCount})，停止自动修复`);
      await downloadService.updateDownloadMetadataInternal(taskId, {
        healingStatus: 'failed_max_retries',
        aiDiagnosis: '已达到最大自动修复次数，请手动检查。'
      });
      return;
    }

    console.log(`[AutoHealing] 正在分析任务 ${taskId} 的错误: ${errorMsg} (第 ${retryCount + 1} 次尝试)`);

    const diagnosis = await aiService.analyzeError(errorMsg, download.filename, download.url);
    if (!diagnosis) {
      console.warn(`[AutoHealing] AI 诊断失败，任务 ${taskId}`);
      return;
    }

    console.log(`[AutoHealing] 诊断结果: ${diagnosis.diagnosis}`);
    console.log(`[AutoHealing] 建议方案: ${diagnosis.solution}`);

    // 保存诊断结果到元数据
    await downloadService.updateDownloadMetadataInternal(taskId, {
      aiDiagnosis: diagnosis.diagnosis,
      aiSolution: diagnosis.solution,
      healingAt: new Date().toISOString(),
      healingRetryCount: retryCount + 1
    });

    if (diagnosis.isRecoverable && diagnosis.action) {
      console.log(`[AutoHealing] 尝试自动修复任务 ${taskId}, 动作: ${diagnosis.action}`);
      await this.executeAction(taskId, diagnosis.action);
    }
  }

  private async executeAction(taskId: number, action: string) {
    const download = await downloadService.getDownloadByIdSimple(taskId);
    if (!download) return;

    // 更新元数据，标记正在修复
    await downloadService.updateDownloadMetadataInternal(taskId, {
      healingStatus: 'healing',
      lastAction: action
    });

    switch (action) {
      case 'RETRY':
        await this.retryTask(taskId);
        break;
      case 'REFRESH_URL':
        // TODO: 这里可能需要用户提供新 URL，或者 AI 自动寻找镜像
        console.warn(`[AutoHealing] REFRESH_URL 动作尚未完全实现，任务 ${taskId}`);
        break;
      default:
        console.warn(`[AutoHealing] 未知的修复动作: ${action}`);
    }
  }

  private async retryTask(taskId: number) {
    const download = await downloadService.getDownloadByIdSimple(taskId);
    if (!download) return;

    // 将状态重置为 pending
    await downloadService.updateDownloadStatusInternal(taskId, 'pending');

    // 重新调度
    const bestWorker = await workerManager.getBestWorker(download.url);
    if (!bestWorker) {
      console.error(`[AutoHealing] 无法为任务 ${taskId} 找到可用的 Worker 进行重试`);
      return;
    }

    const protocol = detectProtocol(download.url);
    const payload: TaskDispatchPayload = {
      taskId: download.id,
      userId: download.userId,
      url: download.url,
      protocol: isBtProtocol(protocol) ? (protocol === 'magnet' ? 'magnet' : 'torrent') : 'http',
      filename: download.filename || undefined,
      metadata: download.metadata as any
    };

    await redis.publish(`${REDIS_CHANNELS.TASKS_DISPATCH}:${bestWorker.workerId}`, JSON.stringify(payload));
    
    // 更新元数据，标记修复成功
    await downloadService.updateDownloadMetadataInternal(taskId, {
      healingStatus: 'healed',
      healedAt: new Date().toISOString()
    });
    
    console.log(`[AutoHealing] 任务 ${taskId} 已重新提交给 Worker ${bestWorker.workerId}`);
  }
}

export const autoHealing = AutoHealingService.getInstance();
