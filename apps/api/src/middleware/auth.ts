import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

/**
 * 主站认证中间件。
 *
 * S3 Task 4 起不止于验签：JWT 是无状态令牌，GM 在后台把用户禁用（isActive=false）
 * 或用户行被删除后，已签发且尚未过期的 token 必须立即失效。因此每请求按主键点查
 * 一次 users（select 仅 3 列，开销可接受），确认账号存在且启用，角色也以库内最新
 * 值为准（降级后旧 token 不再带 admin 权限）。
 *
 * 保持同步函数签名 + then/catch（Express 4 不会自动捕获 async 中间件 reject，
 * 且显式把 DB 错误交给 errorHandler，避免把 5xx 伪装成 401）。
 */
export const auth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('UNAUTHORIZED', 401, '缺少认证令牌'));
    return;
  }

  let payload: { id: number; role: string };
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { id: number; role: string };
  } catch {
    next(new AppError('UNAUTHORIZED', 401, '认证令牌无效'));
    return;
  }

  void prisma.user
    .findUnique({
      where: { id: payload.id },
      select: { id: true, role: true, isActive: true },
    })
    .then(
      (user) => {
        if (!user) {
          next(new AppError('UNAUTHORIZED', 401, '认证令牌对应的账号不存在'));
          return;
        }
        if (!user.isActive) {
          // 与 auth.service.login 的禁用分支同码（401 ACCOUNT_DISABLED），openapi 一致
          next(new AppError('ACCOUNT_DISABLED', 401, '账号已被禁用，请联系管理员'));
          return;
        }
        req.userId = user.id;
        req.userRole = user.role;
        next();
      },
      (err: unknown) => next(err),
    );
};

export const requireAdmin = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') return next(new AppError('FORBIDDEN', 403, '需要管理员权限'));
  next();
};
