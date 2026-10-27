import 'dotenv/config';
import net from 'node:net';
import { PrismaClient } from '@prisma/client';

/** 用 TCP 探活 Redis，避免依赖 ioredis 的连接重试与事件日志 */
function probeRedis(url: string, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      resolve(false);
      return;
    }
    const port = Number(parsed.port || 6379);
    const socket = net.createConnection({ host: parsed.hostname, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

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

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisAvailable = await probeRedis(redisUrl);

  ctx.provide('dbAvailable', dbAvailable);
  ctx.provide('redisAvailable', redisAvailable);

  if (!dbAvailable) {
    console.warn(
      '[integration] 数据库不可用，集成测试将全部跳过。启动数据库：pnpm db:up（或 docker compose up -d db）',
    );
  }
  if (!redisAvailable) {
    console.warn(
      `[integration] Redis 不可用（${redisUrl}），依赖消息总线的集成测试将跳过。启动 Redis：pnpm redis:up（或 docker compose up -d redis）`,
    );
  }
}
