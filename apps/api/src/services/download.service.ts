import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeDownload } from '../utils/serialize';
import { DownloadStatus } from '@dm/shared';
import type { DownloadCreate, DownloadUpdate } from '@dm/shared';

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
  const filename =
    input.filename ?? (new URL(input.url).pathname.split('/').pop() || 'download');
  const row = await prisma.download.create({
    data: { userId, url: input.url, filename },
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

export async function updateDownload(id: number, userId: number, input: DownloadUpdate) {
  const existing = await prisma.download.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '下载记录不存在');
  // 仅取白名单字段
  const { status, progress } = input;
  const row = await prisma.download.update({
    where: { id },
    data: { status, progress: progress ?? undefined },
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
