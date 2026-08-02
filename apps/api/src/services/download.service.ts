import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeDownload } from '../utils/serialize';
import { DownloadStatus } from '@dm/shared';
import type { DownloadCreate } from '@dm/shared';

export async function listDownloads(userId: number) {
  const rows = await prisma.download.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeDownload);
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

export async function deleteDownload(id: number, userId: number) {
  const existing = await prisma.download.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '下载记录不存在');
  await prisma.download.delete({ where: { id } });
}
