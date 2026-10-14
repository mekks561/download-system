import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { GmStorageCleanup } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { GmAuthRequest } from '../middleware/gm-auth';
import * as service from '../services/resource.service';
import * as gmService from '../services/gm.service';
import { prisma } from '../config/prisma';

/** 统一成功信封 */
function ok(res: Response, data: unknown, status = 200) {
  return res
    .status(status)
    .json(ApiSuccessSchema(z.unknown()).parse({ success: true, data, timestamp: new Date().toISOString() }));
}

/**
 * 获取存储统计概览
 * GET /api/gm/storage/stats
 */
import { archivingService } from '../services/archiving.service.js';

export const getStats = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  // 为了确保页面有数据，如果数据库没记录则立即扫描
  let latestStats = await prisma.storageStats.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  const topUsage = await service.getTopUsage(10);

  if (!latestStats) {
    const result = await service.scanStorage();
    latestStats = result.stats;
  }

  // 必须将 BigInt 转换为 string，否则 JSON.stringify 会崩溃
  ok(res, {
    stats: {
      id: latestStats.id,
      totalBytes: latestStats.totalBytes.toString(),
      downloadDir: latestStats.downloadDir.toString(),
      uploadDir: latestStats.uploadDir.toString(),
      pluginDir: latestStats.pluginDir.toString(),
      dbSize: latestStats.dbSize.toString(),
      createdAt: latestStats.createdAt.toISOString(),
    },
    topUsage,
  });
});

/**
 * 获取按 AI 分类统计的存储分布
 * GET /api/gm/storage/category-stats
 */
export const getCategoryStats = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await gmService.getStorageByCategory();
  ok(res, data);
});

export const getTrends = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await gmService.getStorageTrends();
  ok(res, data);
});

/**
 * 获取 AI 驱动的治理洞察
 * GET /api/gm/storage/ai-insights
 */
import { autoScaler } from '../services/auto-scaler.service.js';

export const getAiInsights = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await gmService.getAiGovernanceInsights();
  ok(res, data);
});

export const getAutonomousLogs = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const logs = await redis.lrange('autonomous:logs', 0, -1);
  ok(res, logs.map(l => JSON.parse(l)));
});

export const getAutoScalerStatus = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  ok(res, { enabled: autoScaler.getAutoMode() });
});

export const toggleAutoScaler = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { enabled } = req.body;
  await autoScaler.setAutoMode(enabled);
  ok(res, { enabled });
});

export const getTrafficStats = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await service.detectDuplicates();
  ok(res, data);
});

export const getUserProfiles = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await service.getUserBehaviorProfile();
  ok(res, data);
});

export const getTrafficStats = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await gmService.getHourlyTrafficStats();
  ok(res, data);
});

export const getTrafficForecast = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const history = await gmService.getHourlyTrafficStats();
  const workers = await workerManager.getWorkers();
  const data = await aiService.forecastTraffic(history, workers.length);
  ok(res, data);
});

export const applyAiAction = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { action } = req.body;
  const result = await gmService.applyAiGovernanceAction(action);
  ok(res, result);
});

export const getArchivingSuggestions = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await archivingService.getArchivingSuggestions();
  ok(res, data);
});

export const applyArchiving = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { taskId, action } = req.body;
  const result = await archivingService.applyArchivingAction(taskId, action);
  ok(res, result);
});

export const restoreArchiving = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { taskId } = req.body;
  const result = await archivingService.restoreFromArchive(taskId);
  ok(res, result);
});

/**
 * 手动触发过期资源清理
 * POST /api/gm/storage/cleanup
 */
export const cleanup = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { days } = req.body as GmStorageCleanup;
  const result = await service.cleanupExpiredResources(days);
  
  ok(res, {
    ...result,
    cleanedBytes: result.cleanedBytes.toString(),
  });
});

/**
 * 获取待清理资源的预览信息
 * GET /api/gm/storage/cleanup/preview
 */
export const getCleanupPreview = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const days = Number(req.query.days) || 7;
  const data = await service.getCleanupPreview(days);
  ok(res, data);
});
