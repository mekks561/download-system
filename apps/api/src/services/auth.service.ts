import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';
import { serializeUser } from '../utils/serialize';
import type { UserCreate, Login, UserUpdate, ChangePassword } from '@dm/shared';

// 统一签发 JWT，register 与 login 共用，确保注册即登录契约一致
function signToken(user: { id: number; role: string }) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

export async function register(input: UserCreate) {
  const hash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { username: input.username, email: input.email, password: hash },
  });
  // 返回 { token, user } 对齐 login，修复前端注册后 token=undefined 的契约错配
  return { token: signToken(user), user: serializeUser(user) };
}

export async function login(input: Login) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError('UNAUTHORIZED', 401, '邮箱或密码错误');
  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw new AppError('UNAUTHORIZED', 401, '邮箱或密码错误');
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
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { username: username ?? undefined, email: email ?? undefined },
  });
  return { user: serializeUser(updated) };
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
