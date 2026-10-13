import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import type { DownloadCreate, DownloadUpdate } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/download.service';
import * as engine from '../services/download-engine.service';
import * as torrentEngine from '../services/torrent-engine.service';
import { detectProtocol, isBtProtocol } from '../utils/protocol';
import { getDiskUsage } from '../services/resource.service';
import { getSettings } from '../services/settings.service';

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
  const download = await service.getDownloadById(id, req.userId!);
  
  // 1. 物理磁盘空间检查
  if (download.totalBytes > 0n) {
    const disk = await getDiskUsage();
    if (disk && BigInt(disk.available) < download.totalBytes) {
      throw new AppError('DISK_FULL', 400, `服务器磁盘空间不足，剩余 ${Math.round(Number(disk.available) / 1024 / 1024)} MB`);
    }
  }

  // 2. 用户存储配额检查
  const quota = await service.getUserQuota(req.userId!);
  const currentUsage = await service.getUserStorageUsage(req.userId!);
  if (download.totalBytes > 0n && currentUsage + download.totalBytes > quota) {
    throw new AppError('QUOTA_EXCEEDED', 403, `超出个人存储配额，剩余可用: ${Math.round(Number(quota - currentUsage) / 1024 / 1024)} MB`);
  }

  const protocol = detectProtocol(download.url);

  if (isBtProtocol(protocol)) {
    await torrentEngine.startTorrent(id, req.userId!, download.url);
  } else {
    await engine.start(id, req.userId!);
  }

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
  const download = await service.getDownloadById(id, req.userId!);
  const protocol = detectProtocol(download.url);

  if (isBtProtocol(protocol)) {
    await torrentEngine.pauseTorrent(id, req.userId!);
  } else {
    await engine.pause(id, req.userId!);
  }

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
  const download = await service.getDownloadById(id, req.userId!);
  const protocol = detectProtocol(download.url);

  if (isBtProtocol(protocol)) {
    await torrentEngine.startTorrent(id, req.userId!, download.url);
  } else {
    await engine.start(id, req.userId!);
  }

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
  const download = await service.getDownloadById(id, req.userId!);
  const protocol = detectProtocol(download.url);

  if (isBtProtocol(protocol)) {
    await torrentEngine.cancelTorrent(id, req.userId!);
  } else {
    await engine.cancel(id, req.userId!);
  }

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
  const existing = await service.getDownloadById(id, req.userId!);
  const protocol = detectProtocol(existing.url);

  // 先停下运行中的任务并清理半成品，再删记录
  if (isBtProtocol(protocol)) {
    await torrentEngine.cancelTorrent(id, req.userId!).catch(() => undefined);
  } else {
    await engine.cancel(id, req.userId!).catch(() => undefined);
    if (typeof existing.filename === 'string') {
      engine.purgeArtifacts(existing.filename);
    }
  }
  
  await service.deleteDownload(id, req.userId!);
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    }),
  );
});
