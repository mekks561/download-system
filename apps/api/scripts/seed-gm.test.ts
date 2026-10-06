import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * seed-gm 安全口径回归（与 prisma/seed.test.ts 同一手法，不连真库）：
 * - GM_ADMIN_USERNAME / GM_ADMIN_PASSWORD 缺失必须显式失败，绝不回落硬编码口令；
 * - NODE_ENV=production 直接跳过，不写库；
 * - upsert 的 create/update 都必须带 bcrypt hash（update 含 password，
 *   改 env 重跑即可重置口令）。
 */
const { upsertCalls } = vi.hoisted(() => ({
  upsertCalls: [] as Array<{
    where: { username: string };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }>,
}));

// 隔离本地 .env（本机 .env 含 GM_ADMIN_USERNAME=gmadmin 会掩盖「缺 env」断言）；
// seed-gm.ts 顶部 `import 'dotenv/config'` 是纯副作用，mock 成空模块
vi.mock('dotenv/config', () => ({}));

vi.mock('@prisma/client', () => {
  class MockPrismaClient {
    gmUser: {
      upsert: (args: (typeof upsertCalls)[number]) => Promise<{ id: number }>;
    };
    $disconnect: () => Promise<void>;
    constructor() {
      this.gmUser = {
        upsert: vi.fn(async (args: (typeof upsertCalls)[number]) => {
          upsertCalls.push(args);
          return { id: 1 };
        }),
      };
      this.$disconnect = vi.fn(async () => undefined);
    }
  }
  return { PrismaClient: MockPrismaClient };
});

describe('seed-gm.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    upsertCalls.length = 0;
    delete process.env.GM_ADMIN_USERNAME;
    delete process.env.GM_ADMIN_PASSWORD;
    delete process.env.NODE_ENV;
  });

  it('缺 GM_ADMIN_USERNAME 显式失败，不写库、不硬编码 fallback', async () => {
    process.env.GM_ADMIN_PASSWORD = 'some-password-123';
    const { main } = await import('./seed-gm');
    await expect(main()).rejects.toThrow(/GM_ADMIN_USERNAME/);
    expect(upsertCalls).toHaveLength(0);
  });

  it('缺 GM_ADMIN_PASSWORD 显式失败，不写库、不硬编码 fallback', async () => {
    process.env.GM_ADMIN_USERNAME = 'gmadmin';
    const { main } = await import('./seed-gm');
    await expect(main()).rejects.toThrow(/GM_ADMIN_PASSWORD/);
    expect(upsertCalls).toHaveLength(0);
  });

  it('空字符串 env 同样视为缺失', async () => {
    process.env.GM_ADMIN_USERNAME = '';
    process.env.GM_ADMIN_PASSWORD = '';
    const { main } = await import('./seed-gm');
    await expect(main()).rejects.toThrow(/GM_ADMIN_USERNAME/);
    expect(upsertCalls).toHaveLength(0);
  });

  it('NODE_ENV=production 时跳过，不写库', async () => {
    process.env.NODE_ENV = 'production';
    process.env.GM_ADMIN_USERNAME = 'gmadmin';
    process.env.GM_ADMIN_PASSWORD = 'prod-password-123';
    const { main } = await import('./seed-gm');
    await main();
    expect(upsertCalls).toHaveLength(0);
  });

  it('正常路径：upsert 独立 gm_users，create/update 均写入 bcrypt hash（非明文）', async () => {
    process.env.GM_ADMIN_USERNAME = 'gmadmin';
    process.env.GM_ADMIN_PASSWORD = 'GmAdminPass123';
    const { main } = await import('./seed-gm');
    await main();

    expect(upsertCalls).toHaveLength(1);
    const call = upsertCalls[0];
    expect(call.where).toEqual({ username: 'gmadmin' });
    expect(call.create.username).toBe('gmadmin');
    expect(call.create.role).toBe('admin');
    // 密码必须哈希
    expect(call.create.password).not.toBe('GmAdminPass123');
    expect(String(call.create.password)).toMatch(/^\$2[aby]\$\d{2}\$/);
    // 核心回归：update 必须含同一 hash，重跑 seed 才能改口令
    expect(call.update).toHaveProperty('password');
    expect(call.update.password).toBe(call.create.password);
  });
});
