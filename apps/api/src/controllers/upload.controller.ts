import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/upload.service';

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.listUploads(req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  await service.deleteUpload(id, req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    }),
  );
});
