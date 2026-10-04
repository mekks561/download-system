import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type {
  GmLogin,
  GmResetPassword,
  GmUserQuery,
  GmUserUpdate,
  GmDownloadQuery,
} from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { GmAuthRequest } from '../middleware/gm-auth';
import * as service from '../services/gm.service';

/** 统一成功信封（controller 保持薄，业务全部在 service） */
function ok(res: Response, data: unknown, status = 200) {
  return res
    .status(status)
    .json(ApiSuccessSchema(z.unknown()).parse({ success: true, data, timestamp: new Date().toISOString() }));
}

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

export const uploads = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  ok(res, await service.listAllUploads());
});
