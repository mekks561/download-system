import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';
import { serializeUser } from '../utils/serialize';
import type { UserCreate, Login } from '@dm/shared';

export async function register(input: UserCreate) {
  const hash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { username: input.username, email: input.email, password: hash },
  });
  return serializeUser(user);
}

export async function login(input: Login) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError('UNAUTHORIZED', 401, '邮箱或密码错误');
  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw new AppError('UNAUTHORIZED', 401, '邮箱或密码错误');
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  return { token, user: serializeUser(user) };
}
