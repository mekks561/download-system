import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { uniqueConflictMessage } from '../utils/prisma-errors';
import { ApiErrorSchema } from '@dm/shared';

// P2002 不在此表：它需要按 meta.target 区分冲突字段（用户名/邮箱/文件名…），
// 静态映射表表达不了，在下面单独分支处理。
const prismaErrorMap: Record<string, { code: string; status: number; message: string }> = {
  // Serializable 事务的序列化失败/死锁：语义上是并发写冲突，归一为 409（M1 纵深防御，
  // service 层已先行转换，这里防止其它事务路径漏成 500）
  P2034: { code: 'CONFLICT', status: 409, message: '并发冲突，请重试' },
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

/**
 * 识别 express.json()（body-parser）抛出的请求体解析错误：
 * - type === 'entity.parse.failed'：典型的 malformed JSON（如 `{invalid json`），
 *   body-parser 给出的是带 status=400 的 SyntaxError；
 * - 兜底再判一次 SyntaxError + status 400/413（不同 body-parser 版本字段略有差异）。
 *
 * 不识别时落到后续 500 分支，避免把无关 SyntaxError 误判为客户端错误。
 */
function isRequestBodyParseError(err: unknown): boolean {
  if (err instanceof SyntaxError) {
    const status = (err as { status?: number }).status;
    if (status === 400 || status === 413) return true;
  }
  return (err as { type?: string } | null)?.type === 'entity.parse.failed';
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err.status, err.code, err.message, err.details);
  }
  if (isRequestBodyParseError(err)) {
    return sendError(res, 400, 'VALIDATION_ERROR', '请求体不是合法的 JSON');
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // 唯一约束冲突：按 meta.target 给出「哪个字段被占用」的提示，
    // 而不是笼统的「唯一约束冲突」（用户据此无从下手）
    if (err.code === 'P2002') {
      return sendError(res, 409, 'CONFLICT', uniqueConflictMessage(err.meta?.target));
    }
    const m = prismaErrorMap[err.code] ?? { code: 'INTERNAL_ERROR', status: 500, message: '数据库错误' };
    return sendError(res, m.status, m.code, m.message);
  }
  console.error(err);
  return sendError(res, 500, 'INTERNAL_ERROR', '服务器内部错误');
}
