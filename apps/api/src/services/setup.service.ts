import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeUser } from '../utils/serialize';
import { generateStrongPassword } from '../utils/password';
import { signToken } from './auth.service';
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

/** 首次运行创建管理员账号，返回与 login 一致的 { token, user } */
export async function setupAdmin(input: OnboardingStep2Input) {
  const hash = await bcrypt.hash(input.password, 10);

  // 判定与写入放进同一事务：否则两个并发请求可能同时通过「表为空」检查，
  // 各建一个管理员（首个 admin 权限就此被重复发放）
  const user = await prisma.$transaction(async (tx) => {
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
  });

  return { token: signToken(user), user: serializeUser(user) };
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

  const user = await prisma.$transaction(async (tx) => {
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
  });

  return {
    token: signToken(user),
    user: serializeUser(user),
    generatedPassword,
    mustChangePassword: true,
  };
}
