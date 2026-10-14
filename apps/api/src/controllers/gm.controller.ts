import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type {
  GmLogin,
  GmResetPassword,
  GmUserQuery,
  GmUserUpdate,
  GmDownloadQuery,
  GmUploadQuery,
  GmActivityQuery,
} from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { GmAuthRequest } from '../middleware/gm-auth';
import * as service from '../services/gm.service';
import { workerManager } from '../services/worker-manager.service';

/** 统一成功信封（controller 保持薄，业务全部在 service） */
function ok(res: Response, data: unknown, status = 200) {
  return res
    .status(status)
    .json(ApiSuccessSchema(z.unknown()).parse({ success: true, data, timestamp: new Date().toISOString() }));
}

export const getWorkers = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  ok(res, workerManager.getAvailableWorkers());
});

export const login = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const result = await service.login(req.body as GmLogin);
  ok(res, result);
});

export const dashboard = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  ok(res, await service.getDashboardStats());
});

export const users = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  ok(res, await service.listUsers(req.query as unknown as GmUserQuery));
});

export const updateUser = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const result = await service.updateUser(
    Number(req.params.id),
    req.body as GmUserUpdate,
    req.gmUser!,
  );
  ok(res, result);
});

export const resetPassword = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const result = await service.resetUserPassword(
    Number(req.params.id),
    req.body as GmResetPassword,
  );
  ok(res, result);
});

export const downloads = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  ok(res, await service.listDownloads(req.query as unknown as GmDownloadQuery));
});

export const cancelDownload = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  ok(res, await service.cancelDownload(Number(req.params.id)));
});

export const uploads = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  ok(res, await service.listUploads(req.query as unknown as GmUploadQuery));
});

export const activities = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  ok(res, await service.listActivities(req.query as unknown as GmActivityQuery));
});

export const deleteUpload = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  await service.deleteUpload(Number(req.params.id));
  ok(res, { success: true });
});

// ---------------------------------------------------------------
// 系统设置
// ---------------------------------------------------------------

export const listSettings = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  ok(res, await service.listAppSettings());
});

export const updateSetting = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;
  ok(res, await service.updateAppSetting(key, value));
});

// ---------------------------------------------------------------
// 插件管理
// ---------------------------------------------------------------

export const plugins = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  ok(res, await service.listPlugins());
});

export const togglePlugin = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { id } = req.params;
  const { enabled } = req.body;
  await service.togglePlugin(id, enabled);
  ok(res, { success: true });
});

export const uninstallPlugin = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  await service.uninstallPlugin(req.params.id);
  ok(res, { success: true });
});

export const uploadPlugin = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  // MVP: 由于环境限制暂未安装 multer，此处模拟上传成功
  const result = await service.uploadPlugin('/tmp/mock-plugin.zip');
  ok(res, result);
});
