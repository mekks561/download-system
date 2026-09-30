import { describe, it, expect, vi, beforeEach } from 'vitest';

// 收集 Mock PrismaClient.user.upsert 的调用参数。
// 用 vi.hoisted 提升到与 vi.mock 同级作用域，规避 mock 工厂的闭包限制。
const { upsertCalls } = vi.hoisted(() => ({
  upsertCalls: [] as Array<{ where: { email: string }; create: Record<string, unknown>; update: Record<string, unknown> }>,
}));

vi.mock('@prisma/client', () => {
  // 用 class 保证可被 new 调用（arrow function 不是构造函数）
  class MockPrismaClient {
    user: { upsert: (args: (typeof upsertCalls)[number]) => Promise<{ id: number }> };
    $disconnect: () => Promise<void>;
    constructor() {
      this.user = {
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

describe('seed.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    upsertCalls.length = 0;
    delete process.env.SEED_ADMIN_PASSWORD;
    delete process.env.SEED_USER_PASSWORD;
    delete process.env.NODE_ENV;
  });

  it('upsertUser 在 create 与 update 中都写入哈希密码（回归：update:{} 空更新 bug）', async () => {
    const { upsertUser } = await import('./seed');

    await upsertUser({
      email: 'admin@dm.local',
      username: 'admin',
      password: 'newpass123',
      role: 'admin',
    });

    expect(upsertCalls).toHaveLength(1);
    const call = upsertCalls[0];

    expect(call.where).toEqual({ email: 'admin@dm.local' });
    expect(call.create.role).toBe('admin');
    // 密码必须被哈希，不能是明文
    expect(typeof call.create.password).toBe('string');
    expect(call.create.password).not.toBe('newpass123');
    // 核心断言：update 里必须有 password，否则已存在账号的密码永远不更新
    expect(call.update).toHaveProperty('password');
    expect(call.update.password).toBe(call.create.password);
  });

  it('main 在 NODE_ENV=production 时不写库', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SEED_ADMIN_PASSWORD = 'prodpw1';
    process.env.SEED_USER_PASSWORD = 'prodpw2';

    const { main } = await import('./seed');
    await main();

    expect(upsertCalls).toHaveLength(0);
  });

  it('main 在 SEED_*_PASSWORD 缺失时显式失败，不回落硬编码弱口令', async () => {
    process.env.SEED_USER_PASSWORD = 'only-user-password';

    const { main } = await import('./seed');
    await expect(main()).rejects.toThrow(/SEED_ADMIN_PASSWORD/);

    expect(upsertCalls).toHaveLength(0);
  });

  it('main 用 env 中的密码 upsert admin 与 user 两个账号', async () => {
    process.env.SEED_ADMIN_PASSWORD = 'admin-pw-1';
    process.env.SEED_USER_PASSWORD = 'user-pw-1';

    const { main } = await import('./seed');
    await main();

    expect(upsertCalls.map((c) => c.where.email)).toEqual(['admin@dm.local', 'user@dm.local']);
    expect(upsertCalls.map((c) => c.create.role)).toEqual(['admin', 'user']);
    expect(upsertCalls.every((c) => typeof c.update.password === 'string')).toBe(true);
  });
});
