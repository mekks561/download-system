import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';
import { rethrowUniqueConflict } from '../utils/prisma-errors.js';
import { serializeUser } from '../utils/serialize.js';
import { DUMMY_BCRYPT_HASH } from '../utils/password.js';
import type { UserCreate, Login, UserUpdate, ChangePassword } from '@dm/shared';

/** 用户名/邮箱撞车时统一给的可操作文案（供预检查与并发竞态兜底共用） */
const TAKEN_FALLBACK = '用户名或邮箱已被占用，请更换后重试';

// 统一签发 JWT，register 与 login 共用，确保注册即登录契约一致
// （S1 onboarding 的 setup 也复用本函数，保证 token 载荷 { id, role } 与 auth 中间件一致）
export function signToken(user: { id: number; role: string }) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

/**
 * 注册前的唯一性预检查：明确区分是「用户名」还是「邮箱」被占用。
 *
 * 为什么不在 create 失败后靠 P2002 的 meta.target 反推就够：那样只有一次
 * 尝试机会、且失败 insert 会推进 AUTO_INCREMENT；预检查能把最常见的
 * 「拿已有邮箱重复注册」直接引导到登录，是这条路里最可操作的一步。
 * 竞态（预检查通过、插入时被别人抢占）仍由 rethrowUniqueConflict 兜底。
 */
async function assertRegistrationFieldsFree(username: string, email: string): Promise<void> {
  const taken = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  });
  if (!taken) return;
  // 邮箱优先报告：命中邮箱通常意味着「你已经注册过了」，指向登录比指向改名更有用
  if (taken.email === email) {
    throw new AppError('CONFLICT', 409, '该邮箱已被注册，请直接登录或更换邮箱');
  }
  throw new AppError('CONFLICT', 409, '该用户名已被占用，请更换用户名');
}

export async function register(input: UserCreate) {
  await assertRegistrationFieldsFree(input.username, input.email);

  const hash = await bcrypt.hash(input.password, 10);
  try {
    const user = await prisma.user.create({
      data: { username: input.username, email: input.email, password: hash },
    });
    // 返回 { token, user } 对齐 login，修复前端注册后 token=undefined 的契约错配
    return { token: signToken(user), user: serializeUser(user) };
  } catch (err) {
    rethrowUniqueConflict(err, TAKEN_FALLBACK);
  }
}

export async function login(input: Login) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // 常量时间失败：账号不存在也对 dummy hash 完整跑一次 bcrypt.compare，
  // 避免「无此账号」路径明显更快而被用于枚举邮箱
  const ok = await bcrypt.compare(input.password, user?.password ?? DUMMY_BCRYPT_HASH);
  if (!user || !ok) throw new AppError('UNAUTHORIZED', 401, '邮箱或密码错误');
  // S3 Task 4：GM 后台可禁用用户；放在密码校验之后，避免对禁用账号泄露密码正确性
  if (!user.isActive) throw new AppError('ACCOUNT_DISABLED', 401, '账号已被禁用，请联系管理员');
  return { token: signToken(user), user: serializeUser(user) };
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 404, '用户不存在');
  return { user: serializeUser(user) };
}

export async function updateProfile(userId: number, input: UserUpdate) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 404, '用户不存在');
  // 仅取白名单字段，避免改写 password/role 等
  const { username, email } = input;

  // 占用预检查：必须排除自己，否则「提交未改动的原名/原邮箱」会被误判成冲突
  const orClauses: Prisma.UserWhereInput[] = [];
  if (username !== undefined) orClauses.push({ username });
  if (email !== undefined) orClauses.push({ email });
  if (orClauses.length > 0) {
    const clash = await prisma.user.findFirst({
      where: { id: { not: userId }, OR: orClauses },
      select: { username: true, email: true },
    });
    if (clash) {
      if (email !== undefined && clash.email === email) {
        throw new AppError('CONFLICT', 409, '该邮箱已被注册，请更换邮箱');
      }
      throw new AppError('CONFLICT', 409, '该用户名已被占用，请更换用户名');
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { username: username ?? undefined, email: email ?? undefined },
    });
    return { user: serializeUser(updated) };
  } catch (err) {
    rethrowUniqueConflict(err, TAKEN_FALLBACK);
  }
}

export async function changePassword(userId: number, input: ChangePassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 404, '用户不存在');
  const ok = await bcrypt.compare(input.oldPassword, user.password);
  if (!ok) throw new AppError('UNAUTHORIZED', 401, '原密码错误');
  const hash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });
  return { success: true };
}

export async function deleteAccount(userId: number, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 404, '用户不存在');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new AppError('UNAUTHORIZED', 401, '密码错误');
  // 级联删除会清理 downloads/uploads/files/shares/schedules/activities
  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}

// JWT 为无状态令牌，登出由前端清除 token；后端仅返回成功（如需服务端失效可引入黑名单）
// 非 async 但返回 Promise，避免 require-await（无 await）与 await-thenable（caller await 非 thenable）冲突
export function logout() {
  return Promise.resolve({ success: true });
}
