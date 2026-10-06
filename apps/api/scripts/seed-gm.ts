import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * GM 后台初始管理员种子（S3 Task 4 B-lite）。
 *
 * 与 prisma/seed.ts 同一安全口径：
 * - 账号写入独立 gm_users 表（不是主站 users）；
 * - 严格 env 校验 GM_ADMIN_USERNAME / GM_ADMIN_PASSWORD，缺失即失败，不硬编码口令；
 * - NODE_ENV=production 直接跳过（除非显式改造允许），避免生产账号被覆盖；
 * - upsert 的 update 必须含 password：改完 env 重跑即可重置口令（对齐主 seed 的教训）。
 *
 * 用法：pnpm --filter api db:seed:gm
 */
const prisma = new PrismaClient();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 未设置。请在 .env 中配置 GM 初始管理员凭据（参见 .env.example）`);
  }
  return value;
}

export async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('[seed-gm] production mode - skipping');
    return;
  }

  const username = requiredEnv('GM_ADMIN_USERNAME');
  const password = requiredEnv('GM_ADMIN_PASSWORD');
  const hashed = await bcrypt.hash(password, 10);

  await prisma.gmUser.upsert({
    where: { username },
    create: { username, password: hashed, role: 'admin' },
    update: { password: hashed },
  });

  console.log(`[seed-gm] upserted GM admin "${username}" into gm_users`);
}

// CLI 直跑入口（被 import 时不执行，便于未来补测试）
const isTestRun = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
if (!isTestRun) {
  main()
    .catch((err: unknown) => {
      console.error('[seed-gm] failed:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
