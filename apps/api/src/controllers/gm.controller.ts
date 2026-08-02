import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/gm.service';

export const dashboard = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await service.getDashboardStats();
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const users = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await service.listAllUsers();
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const downloads = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await service.listAllDownloads();
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const uploads = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await service.listAllUploads();
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});
