import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/stats.service';

export const overview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.getOverview(req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const activities = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const data = await service.getActivities(req.userId!, limit);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const trend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : 7;
  const data = await service.getTrend(req.userId!, days);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});
