import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { FileCreateFolder, FileRename, FileMove } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/file.service';

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parentIdRaw = req.query.parentId as string | undefined;
  const parentId =
    parentIdRaw === undefined || parentIdRaw === ''
      ? null
      : Number(parentIdRaw);
  const data = await service.listFiles(req.userId!, parentId);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const createFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.createFolder(req.userId!, req.body as FileCreateFolder);
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

export const rename = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.renameFile(id, req.userId!, req.body as FileRename);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const move = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.moveFile(id, req.userId!, req.body as FileMove);
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
  await service.deleteFile(id, req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    }),
  );
});

export const search = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string | undefined) ?? '';
  const data = await service.searchFiles(req.userId!, q);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});
