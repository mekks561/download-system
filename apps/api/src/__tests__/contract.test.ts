import 'dotenv/config';
import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UserSchema, DownloadSchema } from '@dm/shared';

const prisma = new PrismaClient();

describe('Prisma ↔ Zod 契约一致性', () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it('User 行符合 UserSchema', async () => {
    const row = await prisma.user.create({
      data: { username: 'contract_test', email: 'ct@t.com', password: 'hash' },
    });
    const serialized = {
      ...row,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    expect(() => UserSchema.parse(serialized)).not.toThrow();
    await prisma.user.delete({ where: { id: row.id } });
  });

  it('Download 行符合 DownloadSchema', async () => {
    const user = await prisma.user.create({
      data: { username: 'dl_test', email: 'dl@t.com', password: 'h' },
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
