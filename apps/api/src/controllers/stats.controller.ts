import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/stats.service';
import type { TimeRange } from '../services/stats.service';

const VALID_RANGES: TimeRange[] = ['today', 'week', 'month'];

function resolveRange(raw: unknown): TimeRange {
  return typeof raw === 'string' && VALID_RANGES.includes(raw as TimeRange)
    ? (raw as TimeRange)
    : 'week';
}

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
  const range = resolveRange(req.query.range);
  const data = await service.getTrend(req.userId!, range);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const fileTypes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.getFileTypes(req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});
