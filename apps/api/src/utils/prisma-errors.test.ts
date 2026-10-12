import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { uniqueConflictMessage, isUniqueConflict, rethrowUniqueConflict } from './prisma-errors';

/** 构造 P2002（唯一约束冲突）。meta 省略时模拟驱动未回传 target 的情形。 */
function p2002(target?: unknown) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.3',
    ...(target === undefined ? {} : { meta: { target } }),
  });
}

/** 捕获同步抛出的错误（vitest 的 toThrow 不便断言 error 对象字段） */
function capture(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected function to throw');
}

describe('uniqueConflictMessage · 从 P2002 target 反推冲突字段', () => {
  it('MySQL 索引名 users_email_key → 指向「邮箱」并引导登录', () => {
    const msg = uniqueConflictMessage('users_email_key');
    expect(msg).toContain('邮箱');
    expect(msg).toContain('登录');
  });

  it('MySQL 索引名 users_username_key → 指向「用户名」并引导改名', () => {
    const msg = uniqueConflictMessage('users_username_key');
    expect(msg).toContain('用户名');
    expect(msg).not.toContain('邮箱');
  });

  it('数组形态（PostgreSQL 风格）同样可识别', () => {
    expect(uniqueConflictMessage(['email'])).toContain('邮箱');
    expect(uniqueConflictMessage(['username'])).toContain('用户名');
  });

  it('大小写不敏感（有的驱动会回大写索引名）', () => {
    expect(uniqueConflictMessage('USERS_EMAIL_KEY')).toContain('邮箱');
  });

  it('识别不出字段时用调用方给的兜底文案', () => {
    expect(uniqueConflictMessage('files_user_id_parent_id_name_key', '自定义兜底')).toBe('自定义兜底');
  });

  it('默认兜底不误报「用户名/邮箱」——其它模型（如 File 同名）复用同一中间件', () => {
    const msg = uniqueConflictMessage('files_user_id_parent_id_name_key');
    expect(msg).not.toContain('邮箱');
    expect(msg).not.toContain('用户名');
  });

  it('target 缺失也能给出兜底文案而不是抛错', () => {
    expect(uniqueConflictMessage(undefined)).toBeTruthy();
  });
});

describe('isUniqueConflict', () => {
  it('P2002 判为唯一冲突', () => {
    expect(isUniqueConflict(p2002('users_email_key'))).toBe(true);
  });

  it('其它 Prisma 错误码不算唯一冲突', () => {
    const other = new Prisma.PrismaClientKnownRequestError('x', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });
    expect(isUniqueConflict(other)).toBe(false);
  });

  it('普通 Error 不算唯一冲突', () => {
    expect(isUniqueConflict(new Error('boom'))).toBe(false);
    expect(isUniqueConflict('P2002')).toBe(false);
  });
});

describe('rethrowUniqueConflict', () => {
  it('P2002 → 抛 409 CONFLICT 且带字段提示', () => {
    const err = capture(() => rethrowUniqueConflict(p2002('users_email_key')));
    expect(err).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect((err as Error).message).toContain('邮箱');
  });

  it('P2002 且 target 不可识别 → 用调用方兜底文案', () => {
    const err = capture(() =>
      rethrowUniqueConflict(p2002('files_user_id_parent_id_name_key'), '邮箱已被占用，请更换'),
    );
    expect(err).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect((err as Error).message).toBe('邮箱已被占用，请更换');
  });

  it('非 P2002 原样抛出（同一个错误实例，不被包装/吞掉）', () => {
    const original = new Error('boom');
    expect(capture(() => rethrowUniqueConflict(original))).toBe(original);
  });
});
