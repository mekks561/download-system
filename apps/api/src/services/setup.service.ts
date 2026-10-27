import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { serializeUser } from '../utils/serialize.js';
import { generateStrongPassword } from '../utils/password.js';
import { signToken } from './auth.service.js';
import type { OnboardingStatus, OnboardingSkipResult, OnboardingStep2Input } from '@dm/shared';

/**
 * S1 桌面 Onboarding：首次运行初始化
 *
 * 首次判定以 users 表为空为准，与 Electron 端的哨兵文件（`.onboarded`）
 * 构成双保险——任一信号丢失都不会导致向导反复弹出或漏弹。
 */
export async function isUsersTableEmpty(): Promise<boolean> {
  const count = await prisma.user.count();
  return count === 0;
}

/** 供前端判定是否进入向导（只暴露布尔值，不泄露用户数量） */
export async function getSetupStatus(): Promise<OnboardingStatus> {
  return { needsSetup: await isUsersTableEmpty() };
}

/**
 * 并发败者可能拿到的 Prisma 错误码（@prisma/client 6.x，MySQL）：
 * - P2002：唯一约束冲突（username/email 唯一索引）
 * - P2034：交互式事务写冲突/死锁（序列化失败）
 * - P2010：底层数据库执行失败（MySQL 1213 死锁 / 1205 锁等待经驱动包装后落在这里）
 *
 * 在「count 为空才允许 create」这段事务里，这三种错误的语义都等同于
 * 「已有别的初始化事务抢先提交」，统一转 409，不能漏成 500。
 */
const SERIALIZED_INIT_CONFLICT_CODES = new Set(['P2002', 'P2034', 'P2010']);

const SERIALIZABLE_TX = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

/**
 * 把并发初始化的败者错误归一为 409 CONFLICT；其余错误原样抛出交由全局错误中间件处理。
 */
function rethrowInitConflict(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    SERIALIZED_INIT_CONFLICT_CODES.has(err.code)
  ) {
    throw new AppError('CONFLICT', 409, '系统已完成初始化，无法重复执行');
  }
  throw err;
}

/** 首次运行创建管理员账号，返回与 login 一致的 { token, user } */
export async function setupAdmin(input: OnboardingStep2Input) {
  const hash = await bcrypt.hash(input.password, 10);

  // 判定与写入放进同一 Serializable 事务：默认隔离级别下两个并发事务可能
  // 同时通过「表为空」检查再各建一个管理员（首个 admin 权限被重复发放）。
  // Serializable 把并发写者之一选为败者（死锁/序列化失败），由 catch 归一为 409。
  try {
    const user = await prisma.$transaction(
      async (tx) => {
        const count = await tx.user.count();
        if (count > 0) {
          throw new AppError('CONFLICT', 409, '系统已完成初始化，无法重复执行');
        }
        return tx.user.create({
          data: {
            username: input.username,
            email: input.email,
            password: hash,
            role: 'admin',
          },
        });
      },
      SERIALIZABLE_TX,
    );

    return { token: signToken(user), user: serializeUser(user) };
  } catch (err) {
    rethrowInitConflict(err);
  }
}

/**
 * 跳过向导：创建默认管理员，但密码为**每次随机生成**的强口令，
 * 明文只在本次响应里回传一次（库中只存 bcrypt 密文）。
 *
 * 与计划书的差异：计划书要求固定 `Admin@123`，那等于把弱口令写回仓库——
 * v3.1.0 刚移除 seed 硬编码口令并加了回归测试锁死。故改为随机 + 强制改密。
 */
export async function skipSetup(): Promise<OnboardingSkipResult> {
  const generatedPassword = generateStrongPassword(16);
  const hash = await bcrypt.hash(generatedPassword, 10);

  try {
    const user = await prisma.$transaction(
      async (tx) => {
        const count = await tx.user.count();
        if (count > 0) {
          throw new AppError('CONFLICT', 409, '系统已完成初始化，无法重复执行');
        }
        return tx.user.create({
          data: {
            username: 'admin',
            email: 'admin@dm.local',
            password: hash,
            role: 'admin',
          },
        });
      },
      SERIALIZABLE_TX,
    );

    return {
      token: signToken(user),
      user: serializeUser(user),
      generatedPassword,
      mustChangePassword: true,
    };
  } catch (err) {
    rethrowInitConflict(err);
  }
}
