import 'dotenv/config';
import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UserSchema, DownloadSchema } from '@dm/shared';
import { isDatabaseAvailable } from './helpers/db.js';

const prisma = new PrismaClient();

const dbAvailable = isDatabaseAvailable();

describe.skipIf(!dbAvailable)('Prisma ↔ Zod 契约一致性', () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it('User 行符合 UserSchema', async () => {
    // 唯一后缀：上次运行若在断言前中断，固定用户名/邮箱会留下残行导致唯一键冲突
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const row = await prisma.user.create({
      data: { username: `contract_${suffix}`, email: `ct_${suffix}@t.com`, password: 'hash' },
    });
    const serialized = {
      ...row,
      storageQuota: row.storageQuota.toString(),
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    expect(() => UserSchema.parse(serialized)).not.toThrow();
    await prisma.user.delete({ where: { id: row.id } });
  });

  it('Download 行符合 DownloadSchema', async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user = await prisma.user.create({
      data: { username: `dl_${suffix}`, email: `dl_${suffix}@t.com`, password: 'h' },
    });
    const row = await prisma.download.create({
      data: { userId: user.id, url: 'https://e.com/f.zip', filename: 'f.zip' },
    });
    const serialized = {
      ...row,
      status: row.status,
      progress: Number(row.progress),
      downloadedBytes: Number(row.downloadedBytes),
      totalBytes: Number(row.totalBytes),
      speed: Number(row.speed),
      resumePosition: Number(row.resumePosition),
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    };
    expect(() => DownloadSchema.parse(serialized)).not.toThrow();
    await prisma.download.delete({ where: { id: row.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
