import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * 集成测试的全局探活。
 *
 * 在测试文件被收集（collection）之前跑一次数据库连通性检查，把结果通过
 * `provide('dbAvailable', ...)` 注入；测试文件用 helpers/db.ts 的
 * isDatabaseAvailable() 同步读取，从而能在 describe.skipIf() 里使用。
 *
 * 这样数据库不可用时会整组跳过集成测试，而不是在 beforeAll 抛错导致套件崩溃。
 */
export default async function globalSetup(ctx: { provide: (key: string, value: unknown) => void }) {
  const prisma = new PrismaClient();
  let dbAvailable = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    // 连接失败：保持 false，集成测试将整组跳过
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  ctx.provide('dbAvailable', dbAvailable);

  if (!dbAvailable) {
    console.warn(
      '[integration] 数据库不可用，集成测试将全部跳过。启动数据库：pnpm db:up（或 docker compose up -d db）',
    );
  }
}
