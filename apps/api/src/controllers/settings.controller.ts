import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { DownloadSettingsUpdate } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import * as service from '../services/settings.service.js';

/** 读取下载设置（未配置时返回默认值 + configured:false） */
export const getDownload = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await service.getSettings();
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

/** 保存下载设置（下载目录会被校验并归一化为服务端绝对路径） */
export const updateDownload = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.updateSettings(req.body as DownloadSettingsUpdate);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});
