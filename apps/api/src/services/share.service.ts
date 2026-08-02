import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeShare } from '../utils/serialize';
import { ShareStatus } from '@dm/shared';
import type { ShareCreate } from '@dm/shared';

export async function listShares(userId: number) {
  const rows = await prisma.share.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeShare);
}

export async function createShare(userId: number, input: ShareCreate) {
  const token = crypto.randomUUID();
  const row = await prisma.share.create({
    data: {
      userId,
      fileId: input.fileId,
      token,
      password: input.password ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      downloadLimit: input.downloadLimit ?? null,
      status: 'active',
    },
  });
  return serializeShare(row);
}

export async function updateShare(
  id: number,
  userId: number,
  data: { status?: ShareStatus },
) {
  const existing = await prisma.share.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '分享不存在');
  const row = await prisma.share.update({
    where: { id },
    data,
  });
  return serializeShare(row);
}

export async function deleteShare(id: number, userId: number) {
  const existing = await prisma.share.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '分享不存在');
  await prisma.share.delete({ where: { id } });
}
