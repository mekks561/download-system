import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { DownloadCreate, DownloadUpdate } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import * as service from '../services/download.service.js';
import { DownloadManager } from '../services/download-manager.service.js';
import { detectProtocol, isBtProtocol, BT_DISABLED_MESSAGE } from '../utils/protocol.js';
import { getSettings } from '../services/settings.service.js';
import { AppError } from '../utils/errors.js';

export const parseMetadata = asyncHandler((_req: AuthRequest, _res: Response) => {
  // BT 解析依赖 WebTorrent（node-datachannel），当前镜像不可用，统一明确拒绝，
  // 避免前端等 30 秒超时后才看到「解析失败」。
  throw new AppError('BT_DISABLED', 400, BT_DISABLED_MESSAGE);
});

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

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.getDownloadById(id, req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = await service.updateDownload(id, req.userId!, req.body as DownloadUpdate);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const stats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.getDownloadStats(req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const clearCompleted = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await service.clearCompleted(req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as DownloadCreate;

  if (isBtProtocol(detectProtocol(input.url))) {
    throw new AppError('BT_DISABLED', 400, BT_DISABLED_MESSAGE);
  }
  
  // 非 BT 链接的简单文件名审计
  if (input.filename) {
    const settings = await getSettings();
    const flagged = settings.sensitiveKeywords.some(kw => 
      input.filename!.toLowerCase().includes(kw.toLowerCase())
    );
    if (flagged) {
      throw new AppError('FORBIDDEN', 403, '检测到敏感文件名，禁止创建任务');
    }
  }

  const data = await service.createDownload(req.userId!, input);
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

// 以下四个动作真正驱动服务端下载引擎（download-engine.service），
// 不再只是把数据库状态改一改。

export const start = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  await DownloadManager.start(id, req.userId!);

  const data = await service.getDownloadById(id, req.userId!);
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
  await DownloadManager.pause(id, req.userId!);

  const data = await service.getDownloadById(id, req.userId!);
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
  await DownloadManager.start(id, req.userId!); // 恢复本质也是启动

  const data = await service.getDownloadById(id, req.userId!);
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
  await DownloadManager.cancel(id, req.userId!);

  const data = await service.getDownloadById(id, req.userId!);
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
  await DownloadManager.remove(id, req.userId!);
  
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    }),
  );
});

export const downloadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  await DownloadManager.streamFile(id, req.userId!, res);
});
