import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 读取种子账号密码 env。
 * 安全要求（自远端提交 437d25f「remove hardcoded seed passwords」起）：
 * 不提供硬编码 fallback——变量缺失时必须显式失败，避免弱口令随仓库分发。
 */
function getSeedPassword(envVar: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `${envVar} 未设置。请在 .env 中配置种子账户密码（参见 .env.example）`
    );
  }
  return value;
}

export type SeedRole = 'admin' | 'user';

export interface UpsertUserOpts {
  email: string;
  username: string;
  password: string;
  role: SeedRole;
}

/**
 * Upsert 单个种子账号。
 *
 * 关键修复：update 中必须包含 password。
 * v3.0.0 起写的 `update: {}` 意味着已存在账号的密码永远不会被 seed 更新——
 * 表现是「改完 .env 再 seed，登录仍然 401」（与 domains 集成测试暴露的是同一类缺陷）。
 * updatedAt 由 Prisma 的 `@updatedAt` 自动维护，无需手写。
 */
export async function upsertUser(opts: UpsertUserOpts): Promise<void> {
  const hashed = await bcrypt.hash(opts.password, 10);
  await prisma.user.upsert({
    where: { email: opts.email },
    create: {
      email: opts.email,
      username: opts.username,
      password: hashed,
      role: opts.role,
    },
    update: {
      password: hashed,
    },
  });
  console.log(`[seed] upserted ${opts.email} (role=${opts.role})`);
}

/**
 * Seed 主入口。
 * - 生产环境直接返回：不允许在 production 覆盖或创建测试账号
 * - 密码取自 SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD，缺失即失败
 */
export async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('[seed] production mode - skipping');
    return;
  }

  await upsertUser({
    email: 'admin@dm.local',
    username: 'admin',
    password: getSeedPassword('SEED_ADMIN_PASSWORD'),
    role: 'admin',
  });

  await upsertUser({
    email: 'user@dm.local',
    username: 'user',
    password: getSeedPassword('SEED_USER_PASSWORD'),
    role: 'user',
  });

  console.log('[seed] done');
}

/**
 * 入口副作用：CLI 执行时（`ts-node prisma/seed.ts` / `pnpm db:seed`）自动跑 main()。
 *
 * 测试环境下不自动执行：vitest 里由测试显式调用 main() / upsertUser()，
 * 断言才是确定性的，也不会因为 process.exit 污染测试 runner。
 */
const isTestRun = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

if (!isTestRun) {
  main()
    .catch((err: unknown) => {
      console.error('[seed] failed:', err);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
