import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { DownloadCreate } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/download.service';

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.listDownloads(req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.createDownload(req.userId!, req.body as DownloadCreate);
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

export const start = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.updateDownloadStatus(id, req.userId!, 'downloading');
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const pause = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.updateDownloadStatus(id, req.userId!, 'paused');
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const resume = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.updateDownloadStatus(id, req.userId!, 'downloading');
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const cancel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.updateDownloadStatus(id, req.userId!, 'cancelled');
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
  await service.deleteDownload(id, req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    }),
  );
});
