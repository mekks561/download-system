import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema, StorageBrowseQuerySchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/storage.service';

/**
 * 服务端目录浏览（下载目录选择器）。
 *
 * 权限：管理员专属（见 routes/fs.routes.ts）——会暴露服务端目录结构，
 * 普通账号不需要也不应该看到。
 */
export const browse = asyncHandler(async (req: AuthRequest, res: Response) => {
  // 查询参数经过 validate() 归一化，这里只做「缺失即根目录」的兜底
  const { path } = StorageBrowseQuerySchema.parse(req.query);
  const data = await service.listDirectories(path);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});
