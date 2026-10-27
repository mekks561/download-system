import 'dotenv/config';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import { isIntegrationReady } from './helpers/db.js';

/**
 * M1 真并发回归：POST /api/auth/setup 与 /api/auth/skip-setup 的
 * 「users 表为空才允许创建」守卫在真 MySQL（Serializable 事务）下是否成立。
 *
 * 不 mock：两个 HTTP 请求经 supertest → express → service → Prisma → MySQL 3306
 * 真正同时开跑，败者必须以 409 CONFLICT 收口（而非 500），且恰好只建出 1 个账号。
 *
 * 数据安全：本文件运行前对全部业务表做内存快照，结束（含失败）后在 afterAll
 * 按原 id / 原 bcrypt hash / 原时间戳原样恢复（fileParallelism 已关闭，
 * 本文件执行期间没有其它测试文件并发写库）。
 */
const dbAvailable = isIntegrationReady();

type UserRow = {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
};

interface Snapshot {
  users: UserRow[];
  // 其余子表按依赖顺序恢复；当前开发库通常只有 users 种子 + 少量残留，
  // 全量快照是为了在任何库状态下都能逐行还原
  downloads: Awaited<ReturnType<typeof prisma.download.findMany>>;
  uploads: Awaited<ReturnType<typeof prisma.upload.findMany>>;
  files: Awaited<ReturnType<typeof prisma.file.findMany>>;
  shares: Awaited<ReturnType<typeof prisma.share.findMany>>;
  schedules: Awaited<ReturnType<typeof prisma.schedule.findMany>>;
  scheduleLogs: Awaited<ReturnType<typeof prisma.scheduleLog.findMany>>;
  activities: Awaited<ReturnType<typeof prisma.activity.findMany>>;
}

async function wipeBusinessTables(): Promise<void> {
  // 严格按外键依赖顺序删除（先子后父）
  await prisma.scheduleLog.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.share.deleteMany();
  await prisma.download.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();
}

async function takeSnapshot(): Promise<Snapshot> {
  const [users, downloads, uploads, files, shares, schedules, scheduleLogs, activities] =
    await Promise.all([
      prisma.user.findMany({ orderBy: { id: 'asc' } }),
      prisma.download.findMany({ orderBy: { id: 'asc' } }),
      prisma.upload.findMany({ orderBy: { id: 'asc' } }),
      prisma.file.findMany({ orderBy: { id: 'asc' } }),
      prisma.share.findMany({ orderBy: { id: 'asc' } }),
      prisma.schedule.findMany({ orderBy: { id: 'asc' } }),
      prisma.scheduleLog.findMany({ orderBy: { id: 'asc' } }),
      prisma.activity.findMany({ orderBy: { id: 'asc' } }),
    ]);
  return {
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      password: u.password,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
    downloads,
    uploads,
    files,
    shares,
    schedules,
    scheduleLogs,
    activities,
  };
}

async function restoreSnapshot(snap: Snapshot): Promise<void> {
  await wipeBusinessTables();

  for (const u of snap.users) {
    await prisma.user.create({
      data: {
        id: u.id,
        username: u.username,
        email: u.email,
        password: u.password, // 原 bcrypt hash 原样写回，旧密码/种子口令继续有效
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      },
    });
  }
  // file 有 parentId 自引用，按 id 升序保证父行先插入
  for (const f of [...snap.files].sort((a, b) => a.id - b.id)) {
    await prisma.file.create({ data: f });
  }
  for (const d of snap.downloads) {
    const { metadata, ...rest } = d;
    await prisma.download.create({
      data: metadata === null ? rest : { ...rest, metadata: metadata as Prisma.InputJsonValue },
    });
  }
  for (const up of snap.uploads) await prisma.upload.create({ data: up });
  for (const s of snap.schedules) await prisma.schedule.create({ data: s });
  for (const sh of snap.shares) await prisma.share.create({ data: sh });
  for (const l of snap.scheduleLogs) await prisma.scheduleLog.create({ data: l });
  for (const a of snap.activities) {
    // Prisma 的 Json? 列不能直接写 null（需 JsonNull/DbNull 区分）；
    // 快照里 null 即 DB NULL，省略该列即可还原
    const { metadata, ...rest } = a;
    await prisma.activity.create({
      data:
        metadata === null
          ? rest
          : { ...rest, metadata: metadata as Prisma.InputJsonValue },
    });
  }
}

describe.skipIf(!dbAvailable)('setup / skip-setup 真并发守卫（M1，MySQL Serializable）', () => {
  let snapshot: Snapshot;

  beforeAll(async () => {
    snapshot = await takeSnapshot();
    await wipeBusinessTables();
  });

  beforeEach(async () => {
    // 每个用例都从空表开始（上一例只建出 1 个 user，无子表数据）
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // 即便用例失败也尽量恢复开发库
    await restoreSnapshot(snapshot);

    // 恢复自检：行数与快照一致，账号逐个点名（交付证据）
    const restoredUsers = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true },
      orderBy: { id: 'asc' },
    });
    expect(restoredUsers).toHaveLength(snapshot.users.length);
    expect(restoredUsers.map((u) => u.email)).toEqual(snapshot.users.map((u) => u.email));
    console.log('[M1] users 表已恢复:', JSON.stringify(restoredUsers));

    await prisma.$disconnect();
  });

  it('POST /setup 两个不同身份并发：恰好 1 个 201 + 1 个 409，users 恰好新增 1 条', async () => {
    const payloadA = { username: 'race_admin_a', email: 'race-a@t.com', password: 'StrongPass123' };
    const payloadB = { username: 'race_admin_b', email: 'race-b@t.com', password: 'StrongPass456' };

    const [resA, resB] = await Promise.all([
      request(app).post('/api/auth/setup').send(payloadA),
      request(app).post('/api/auth/setup').send(payloadB),
    ]);

    const statuses = [resA.status, resB.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);

    const winner = [resA, resB].find((r) => r.status === 201)!;
    const loser = [resA, resB].find((r) => r.status === 409)!;
    expect(winner.body.success).toBe(true);
    expect(winner.body.data.token).toBeTruthy();
    expect(winner.body.data.user.role).toBe('admin');
    expect(loser.body.error.code).toBe('CONFLICT');

    expect(await prisma.user.count()).toBe(1);
    const rows = await prisma.user.findMany({ select: { email: true } });
    expect(rows.map((r) => r.email).sort()).toEqual(
      [payloadA.email, payloadB.email].filter((email) => email === winner.body.data.user.email),
    );
  });

  it('POST /skip-setup 同身份两并发：恰好 1 个成功（201）+ 1 个 409，users 恰好新增 1 条', async () => {
    const [resA, resB] = await Promise.all([
      request(app).post('/api/auth/skip-setup').send({}),
      request(app).post('/api/auth/skip-setup').send({}),
    ]);

    const statuses = [resA.status, resB.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);

    const winner = [resA, resB].find((r) => r.status === 201)!;
    const loser = [resA, resB].find((r) => r.status === 409)!;
    expect(winner.body.data.generatedPassword).toBeTruthy();
    expect(winner.body.data.mustChangePassword).toBe(true);
    expect(winner.body.data.user.email).toBe('admin@dm.local');
    expect(loser.body.error.code).toBe('CONFLICT');

    expect(await prisma.user.count()).toBe(1);
    const row = await prisma.user.findFirst({ select: { username: true, email: true, role: true } });
    expect(row).toMatchObject({ username: 'admin', email: 'admin@dm.local', role: 'admin' });
  });
});
