import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from './error';
import { AppError } from '../utils/errors';

/**
 * 错误信封回归：P2002（唯一约束）必须给出「哪个字段被占用」的可操作提示，
 * 而不是笼统的「唯一约束冲突」——后者是线上注册页实际暴露给用户的文案。
 */

interface Captured {
  status: number;
  body: { success: boolean; error: { code: string; message: string } };
}

function run(err: unknown): Captured {
  const captured = { status: 0 } as Captured;
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(payload: unknown) {
      captured.body = payload as Captured['body'];
      return this;
    },
  } as unknown as Response;

  errorHandler(err, {} as Request, res, (() => undefined) as NextFunction);
  return captured;
}

function known(code: string, target?: unknown) {
  return new Prisma.PrismaClientKnownRequestError(`db error ${code}`, {
    code,
    clientVersion: '6.19.3',
    ...(target === undefined ? {} : { meta: { target } }),
  });
}

describe('errorHandler · P2002 唯一约束冲突按字段给提示', () => {
  it('users_email_key → 409 且提示邮箱（不再是一句「唯一约束冲突」）', () => {
    const { status, body } = run(known('P2002', 'users_email_key'));
    expect(status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('邮箱');
    expect(body.error.message).not.toBe('唯一约束冲突');
  });

  it('users_username_key → 409 且提示用户名', () => {
    const { body } = run(known('P2002', 'users_username_key'));
    expect(body.error.message).toContain('用户名');
  });

  it('非用户表的唯一冲突（如 File 同名）→ 不误报「用户名/邮箱」', () => {
    const { status, body } = run(known('P2002', 'files_user_id_parent_id_name_key'));
    expect(status).toBe(409);
    expect(body.error.message).not.toContain('邮箱');
    expect(body.error.message).not.toContain('用户名');
  });

  it('meta.target 缺失 → 仍归 409，不落 500', () => {
    const { status, body } = run(known('P2002'));
    expect(status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toBeTruthy();
  });
});

describe('errorHandler · 其它分支未被破坏', () => {
  it('P2034（序列化失败/死锁）→ 409 并发冲突', () => {
    const { status, body } = run(known('P2034'));
    expect(status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('P2025 → 404 NOT_FOUND', () => {
    const { status, body } = run(known('P2025'));
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('未收录的 Prisma 错误码 → 500 INTERNAL_ERROR', () => {
    const { status, body } = run(known('P2024'));
    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('AppError 原样透出自己的 code/status/message', () => {
    const { status, body } = run(new AppError('FORBIDDEN', 403, '仅允许浏览下载根目录内的路径'));
    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toBe('仅允许浏览下载根目录内的路径');
  });

  it('非预期错误 → 500，且不把原始异常信息泄漏给客户端', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { status, body } = run(new Error('内部堆栈细节 SECRET'));
    expect(status).toBe(500);
    expect(body.error.message).toBe('服务器内部错误');
    expect(body.error.message).not.toContain('SECRET');
    spy.mockRestore();
  });
});
