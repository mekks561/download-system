import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 读取种子账号密码 env，未设置时用 fallback（打印警告）。
 * 避免本地开发没有 .env 时 seed 直接报错退出，方便测试与快速启动。
 */
function getSeedPassword(envVar: string, fallback: string): string {
  const v = process.env[envVar];
  if (!v) {
    console.warn(`[seed] ${envVar} not set, using fallback '${fallback}'`);
    return fallback;
  }
  return v;
}

export type SeedRole = 'admin' | 'user';

export interface UpsertUserOpts {
  email: string;
  username: string;
  password: string;
  role: SeedRole;
}

/**
 * Upsert 单个用户账号——关键修复：update 中包含 password 字段。
 * v3.0.0 历史 bug：update = {}，已存在账号的密码永远不会被 seed 更新。
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
    // 修复：update 显式包含 password + updatedAt
    update: {
      password: hashed,
      updatedAt: new Date(),
    },
  });
  console.log(`[seed] upserted ${opts.email} (role=${opts.role})`);
}

/**
 * Seed 主入口。
 * - SPEC §5.3 安全要求：NODE_ENV === 'production' 时立即返回，避免生产账号被覆盖
 * - 读取 SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD（未设置时使用 fallback，打印 warn）
 * - 调用 upsertUser 创建/更新 admin + user 两个测试账号
 */
export async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('[seed] production mode - skipping');
    return;
  }

  const adminPassword = getSeedPassword('SEED_ADMIN_PASSWORD', 'admin123');
  const userPassword = getSeedPassword('SEED_USER_PASSWORD', 'user123');

  await upsertUser({
    email: 'admin@dm.local',
    username: 'admin',
    password: adminPassword,
    role: 'admin',
  });

  await upsertUser({
    email: 'user@dm.local',
    username: 'user',
    password: userPassword,
    role: 'user',
  });

  console.log('[seed] done');
}

// main() 副作用：import seed.ts 或 CLI 执行都自动运行。
// 在 vitest 下不调用 process.exit / $disconnect，避免污染测试 runner
main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    if (!process.env.VITEST) {
      process.exit(1);
    }
  })
  .finally(async () => {
    if (!process.env.VITEST) {
      await prisma.$disconnect();
    }
  });
