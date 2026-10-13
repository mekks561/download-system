import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { GmStorageCleanup } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { GmAuthRequest } from '../middleware/gm-auth';
import * as service from '../services/resource.service';
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
