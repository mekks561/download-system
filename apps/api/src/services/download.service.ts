import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeDownload } from '../utils/serialize';
import { DownloadStatus } from '@dm/shared';
import type { DownloadCreate, DownloadUpdate } from '@dm/shared';

export async function getUserStorageUsage(userId: number): Promise<bigint> {
  const result = await prisma.download.aggregate({
    where: { 
      userId,
      status: { in: ['completed', 'downloading', 'paused'] } 
    },
    _sum: { totalBytes: true }
  });
  return result._sum.totalBytes ?? 0n;
}

export async function getUserQuota(userId: number): Promise<bigint> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageQuota: true }
  });
  return user?.storageQuota ?? 0n;
}

export async function listDownloads(userId: number) {
  const rows = await prisma.download.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeDownload);
}

export async function getDownloadById(id: number, userId: number) {
  const row = await prisma.download.findFirst({ where: { id, userId } });
  if (!row) throw new AppError('NOT_FOUND', 404, '下载记录不存在');
  return serializeDownload(row);
}

export async function createDownload(userId: number, input: DownloadCreate) {
  let filename = input.filename;
  if (!filename) {
    try {
      filename = new URL(input.url).pathname.split('/').pop() || 'download';
    } catch {
      filename = 'torrent_file';
    }
  }
  
  const row = await prisma.download.create({
    data: { 
      userId, 
      url: input.url, 
      filename: filename!,
      metadata: input.metadata as any,
    },
  });
  return serializeDownload(row);
}

export async function updateDownloadStatus(
  id: number,
  userId: number,
  status: DownloadStatus,
) {
  const existing = await prisma.download.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '下载记录不存在');
  const row = await prisma.download.update({
    where: { id },
    data: { status },
  });
  return serializeDownload(row);
}

export async function getDownloadByIdSimple(id: number) {
  return await prisma.download.findUnique({ where: { id } });
}

export async function updateDownloadStatusInternal(
  id: number,
  status: DownloadStatus,
) {
  const row = await prisma.download.update({
    where: { id },
    data: { status },
  });
  return serializeDownload(row);
}

export async function updateDownloadMetadataInternal(
  id: number,
  metadata: Record<string, any>,
) {
  const existing = await prisma.download.findUnique({ where: { id } });
  const currentMetadata = (existing?.metadata as any) || {};
  
  const row = await prisma.download.update({
    where: { id },
    data: { 
      metadata: { ...currentMetadata, ...metadata } 
    },
  });
  return serializeDownload(row);
}

export async function updateDownload(id: number, userId: number, input: DownloadUpdate) {
  const existing = await prisma.download.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '下载记录不存在');
  
  const { status, progress, metadata } = input;
  const currentMetadata = (existing.metadata as any) || {};
  
  const row = await prisma.download.update({
    where: { id },
    data: { 
      status: status ?? undefined, 
      progress: progress ?? undefined,
      metadata: metadata ? { ...currentMetadata, ...metadata } : undefined
    },
  });
  return serializeDownload(row);
}

export async function getDownloadStats(userId: number) {
  const [total, completed, failed, sizeAgg, downloadedAgg] = await Promise.all([
    prisma.download.count({ where: { userId } }),
    prisma.download.count({ where: { userId, status: 'completed' } }),
    prisma.download.count({ where: { userId, status: 'error' } }),
    prisma.download.aggregate({ where: { userId }, _sum: { totalBytes: true } }),
    prisma.download.aggregate({ where: { userId }, _sum: { downloadedBytes: true } }),
  ]);
  return {
    totalDownloads: total,
    completedDownloads: completed,
    failedDownloads: failed,
    totalSize: Number(sizeAgg._sum.totalBytes ?? 0),
    downloadedSize: Number(downloadedAgg._sum.downloadedBytes ?? 0),
  };
}

export async function clearCompleted(userId: number) {
  const result = await prisma.download.deleteMany({
    where: { userId, status: 'completed' },
  });
  return { deleted: result.count };
}

export async function deleteDownload(id: number, userId: number) {
  const existing = await prisma.download.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '下载记录不存在');
  await prisma.download.delete({ where: { id } });
}

export async function getUnfinishedTasksByWorkerId(workerId: string) {
  // 查找绑定在该 worker 且未完成的任务
  // MariaDB 不支持 Prisma 的 Json path 数组过滤，先按状态查再在内存按 workerId 过滤
  const rows = await prisma.download.findMany({
    where: {
      status: { in: ['downloading', 'pending', 'paused'] }
    }
  });
  return rows.filter(
    r => (r.metadata as Record<string, unknown> | null)?.workerId === workerId
  );
}
