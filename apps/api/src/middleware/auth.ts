import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export const auth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 401, '缺少认证令牌'));
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { id: number; role: string };
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch {
    next(new AppError('UNAUTHORIZED', 401, '认证令牌无效'));
  }
};

export const requireAdmin = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') return next(new AppError('FORBIDDEN', 403, '需要管理员权限'));
  next();
};
