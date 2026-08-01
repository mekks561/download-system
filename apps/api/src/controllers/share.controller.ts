import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { ShareCreate, ShareStatus } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/share.service';

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.listShares(req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.createShare(req.userId!, req.body as ShareCreate);
  res
    .status(201)
    .json(
      ApiSuccessSchema(z.unknown()).parse({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }),
    );
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.updateShare(id, req.userId!, req.body as { status?: ShareStatus });
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
  await service.deleteShare(id, req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    }),
  );
});
