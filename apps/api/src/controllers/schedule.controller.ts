import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { ScheduleCreate } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/schedule.service';

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.listSchedules(req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.createSchedule(req.userId!, req.body as ScheduleCreate);
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
  const data = await service.updateSchedule(
    id,
    req.userId!,
    req.body as { isEnabled?: boolean; cron?: string },
  );
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
  await service.deleteSchedule(id, req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    }),
  );
});

export const logs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.listScheduleLogs(id, req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});
