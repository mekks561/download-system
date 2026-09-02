import { describe, it, expect, vi, beforeEach } from 'vitest';

// 全局收集 PrismaClient.user.upsert 的调用参数
let upsertCalls: any[] = [];

// 使用 vi.hoisted 将变量提升到与 vi.mock 同级作用域（解决闭包）
const { upsertCallsRef } = vi.hoisted(() => ({
  upsertCallsRef: { current: [] as any[] },
}));

beforeEach(() => {
  vi.resetModules();
  upsertCallsRef.current = [];
  upsertCalls = upsertCallsRef.current;
  delete process.env.SEED_ADMIN_PASSWORD;
  delete process.env.SEED_USER_PASSWORD;
  const prev = process.env.NODE_ENV;
  if (prev) delete process.env.NODE_ENV;
});

vi.mock('@prisma/client', () => {
  // 用 class 保证可被 new 调用（避免 arrow function 非 constructor 错误）
  class MockPrismaClient {
    user: any;
    $disconnect: any;
    constructor() {
      // instance variable: upsert mock
      this.user = {
        upsert: vi.fn(async (args: any) => {
          upsertCallsRef.current.push(args);
          return { id: 1 };
        }),
      };
      this.$disconnect = vi.fn(async () => undefined);
    }
  }
  return {
    PrismaClient: MockPrismaClient,
  };
});

describe('seed.ts', () => {
  it('upsertUser: passes hashed password in both create and update + updatedAt', async () => {
    const seedMod = await import('./seed');
    expect(seedMod.upsertUser).toBeDefined();

    await seedMod.upsertUser({
      email: 'admin@dm.local',
      username: 'admin',
      password: 'newpass123',
      role: 'admin',
    });

    // upsertUser 必须独立调用 1 次 upsert
    // 注意：main() 副作用也可能调用了 upsert，所以取最后一次（upsertUser 的调用）
    const calls = upsertCallsRef.current;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const call = calls[calls.length - 1]; // 最后一次即 upsertUser 的显式调用

    expect(call.where).toEqual({ email: 'admin@dm.local' });
    expect(call.create).toHaveProperty('password');
    // 关键断言：update 中必须包含 password（修复空 update bug）
    expect(call.update).toHaveProperty('password');
    // update 中包含 updatedAt
    expect(call.update).toHaveProperty('updatedAt');
    // 密码被哈希，非明文
    expect(call.create.password).not.toBe('newpass123');
    expect(typeof call.create.password).toBe('string');
    expect(call.create.password.length).toBeGreaterThan(0);
    // create 与 update 使用相同的 hash
    expect(call.update.password).toBe(call.create.password);
  });

  it('main: does NOT call upsert when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SEED_ADMIN_PASSWORD = 'prodpw1';
    process.env.SEED_USER_PASSWORD = 'prodpw2';

    // 触发模块加载 -> main() 副作用
    await import('./seed');
    // 等待异步 main 完成
    await new Promise((resolve) => setTimeout(resolve, 30));

    // production 模式下，upsert 绝不能被调用
    expect(upsertCallsRef.current).toHaveLength(0);
  });
});
