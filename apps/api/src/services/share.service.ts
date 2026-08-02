import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeShare } from '../utils/serialize';
import type { ShareCreate, ShareUpdate } from '@dm/shared';

export async function listShares(userId: number) {
  const rows = await prisma.share.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeShare);
}

export async function createShare(userId: number, input: ShareCreate) {
  // IDOR 防护：校验 fileId 归属当前用户，禁止对他人文件创建分享
  const file = await prisma.file.findFirst({ where: { id: input.fileId, userId } });
  if (!file) throw new AppError('NOT_FOUND', 404, '文件不存在');

  const token = crypto.randomUUID();
  // 密码哈希存储，避免明文泄露
  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null;
  const row = await prisma.share.create({
    data: {
      userId,
      fileId: input.fileId,
      token,
      password: passwordHash,
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
  data: ShareUpdate,
) {
  const existing = await prisma.share.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '分享不存在');
  // 仅取白名单字段，防止越权改写 userId/fileId/token 等
  const { status } = data;
  const row = await prisma.share.update({
    where: { id },
    data: { status },
  });
  return serializeShare(row);
}

export async function deleteShare(id: number, userId: number) {
  const existing = await prisma.share.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '分享不存在');
  await prisma.share.delete({ where: { id } });
}
