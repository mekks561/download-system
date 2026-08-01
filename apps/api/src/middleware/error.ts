import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { ApiErrorSchema } from '@dm/shared';

const prismaErrorMap: Record<string, { code: string; status: number; message: string }> = {
  P2002: { code: 'CONFLICT', status: 409, message: '唯一约束冲突' },
  P2025: { code: 'NOT_FOUND', status: 404, message: '记录不存在' },
  P2003: { code: 'VALIDATION_ERROR', status: 400, message: '外键约束失败' },
};

function sendError(res: Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json(
    ApiErrorSchema.parse({
      success: false,
      error: { code, message, details },
      timestamp: new Date().toISOString(),
    }),
  );
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err.status, err.code, err.message, err.details);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const m = prismaErrorMap[err.code] ?? { code: 'INTERNAL_ERROR', status: 500, message: '数据库错误' };
    return sendError(res, m.status, m.code, m.message);
  }
  console.error(err);
  return sendError(res, 500, 'INTERNAL_ERROR', '服务器内部错误');
}
