import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { DownloadCreate, DownloadUpdate } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/download.service';
import { DownloadManager } from '../services/download-manager.service';
import * as torrentEngine from '../services/torrent-engine.service';
import { detectProtocol } from '../utils/protocol';
import { getSettings } from '../services/settings.service';
import { AppError } from '../utils/errors';

export const parseMetadata = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { url, file } = req.body;
  
  let data;
  if (file && typeof file === 'string') {
    // 处理 base64 格式的种子文件
    const buffer = Buffer.from(file.split(',')[1] || file, 'base64');
    data = await torrentEngine.parseMetadata(buffer);
  } else {
    data = await torrentEngine.parseMetadata(url);
  }

  // 敏感词审计
  const settings = await getSettings();
  const flagged = settings.sensitiveKeywords.some(kw => 
    data.name.toLowerCase().includes(kw.toLowerCase()) ||
    data.files.some(f => f.name.toLowerCase().includes(kw.toLowerCase()))
  );
  
  if (flagged) {
    throw new AppError('FORBIDDEN', 403, '检测到敏感内容，禁止下载');
  }

  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
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
