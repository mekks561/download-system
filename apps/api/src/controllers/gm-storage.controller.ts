import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { GmStorageCleanup } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { GmAuthRequest } from '../middleware/gm-auth.js';
import * as service from '../services/resource.service.js';
import * as gmService from '../services/gm.service.js';
import { prisma } from '../config/prisma.js';
import { redis } from '../config/redis.js';
import { workerManager } from '../services/worker-manager.service.js';
import { forecastTraffic } from '../services/ai.service.js';

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
    // 这里 result.stats 已经是序列化后的对象，我们直接返回即可
    return ok(res, {
      stats: result.stats,
      topUsage: result.topUsage,
    });
  }

  // 必须将 BigInt 转换为 string，否则 JSON.stringify 会崩溃
  if (!latestStats) {
    return ok(res, { stats: null, topUsage });
  }

  ok(res, {
    stats: {
      id: latestStats.id,
      totalBytes: latestStats.totalBytes.toString(),
      downloadDir: latestStats.downloadDir.toString(),
      uploadDir: latestStats.uploadDir.toString(),
      pluginDir: latestStats.pluginDir.toString(),
      dbSize: latestStats.dbSize.toString(),
      createdAt: typeof latestStats.createdAt === 'string' ? latestStats.createdAt : latestStats.createdAt.toISOString(),
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
  try {
    const logs = await redis.lrange('autonomous:logs', 0, -1);
    ok(res, logs.map(l => JSON.parse(l)));
  } catch (err) {
    console.warn('[GM] 无法从 Redis 读取自治日志:', err);
    ok(res, []);
  }
});

export const getAutoScalerStatus = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  ok(res, { enabled: autoScaler.getAutoMode() });
});

export const toggleAutoScaler = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { enabled } = req.body;
  await autoScaler.setAutoMode(enabled);
  ok(res, { enabled });
});

export const getDuplicates = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
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

export const getTrafficForecast = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const history = await gmService.getHourlyTrafficStats();
  const workers = workerManager.getWorkers();
  const data = await forecastTraffic(history, workers.length);
  ok(res, data);
});

export const getGeoTrafficStats = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await gmService.getGeoTrafficStats();
  ok(res, data);
});

export const getGeoSchedulingInsights = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await gmService.getGeoSchedulingInsights();
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

/**
 * 列出所有地域策略
 * GET /api/gm/storage/geo-policies
 */
export const listGeoPolicies = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  const data = await gmService.listGeoPolicies();
  ok(res, data);
});

/**
 * 创建地域策略
 * POST /api/gm/storage/geo-policies
 */
export const createGeoPolicy = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const data = await gmService.createGeoPolicy(req.body);
  ok(res, data, 201);
});

/**
 * 更新地域策略
 * PATCH /api/gm/storage/geo-policies/:id
 */
export const updateGeoPolicy = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await gmService.updateGeoPolicy(id, req.body);
  ok(res, data);
});

/**
 * 删除地域策略
 * DELETE /api/gm/storage/geo-policies/:id
 */
export const deleteGeoPolicy = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const id = Number(req.params.id);
  await gmService.deleteGeoPolicy(id);
  ok(res, null, 204);
});
