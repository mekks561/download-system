import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * 主站 auth.service 安全回归（mock prisma，不连库）：
 * S3 Task 4 起邮箱不存在也必须走一次 bcrypt.compare（dummy hash），
 * 与密码错误路径保持等时，避免账号枚举时序侧信。
 */
const { userFindUnique, userFindFirst, userCreate, userUpdate } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock('../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      findFirst: userFindFirst,
      create: userCreate,
      update: userUpdate,
    },
  },
}));

import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as service from './auth.service.js';

/** 捕获 rejection 的错误对象，便于同时断言 code 与 message */
async function captureRejection(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (err) {
    return err;
  }
  throw new Error('expected promise to reject');
}

describe('auth.service.login 常量时间失败', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    vi.restoreAllMocks();
    process.env.JWT_SECRET = 'unit-test-main-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('邮箱不存在：仍调用 bcrypt.compare（dummy hash），统一 401 UNAUTHORIZED', async () => {
    userFindUnique.mockResolvedValue(null);
    const compareSpy = vi.spyOn(bcrypt, 'compare');

    await expect(
      service.login({ email: 'nobody_zzz@t.com', password: 'whatever12' }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });

    expect(compareSpy).toHaveBeenCalledOnce();
  });

  it('密码错误：401 UNAUTHORIZED（与账号不存在同码同态）', async () => {
    userFindUnique.mockResolvedValue({
      id: 1,
      username: 'u',
      email: 'u@t.com',
      role: 'user',
      isActive: true,
      password: await bcrypt.hash('correct-horse', 10),
    });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      service.login({ email: 'u@t.com', password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });
});

/**
 * 注册/改资料撞唯一约束时，不能再回一句「唯一约束冲突」——
 * 用户据此既不知道该改哪个字段，也看不到「已有账号就去登录」这条路。
 */
const CREATED_ROW = {
  id: 7,
  username: 'newbie',
  email: 'newbie@example.com',
  password: 'hashed',
  role: 'user' as const,
  isActive: true,
  createdAt: new Date('2026-10-12T00:00:00.000Z'),
  updatedAt: new Date('2026-10-12T00:00:00.000Z'),
};

function p2002(target?: string) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.3',
    ...(target === undefined ? {} : { meta: { target } }),
  });
}

describe('auth.service.register · 唯一性预检查', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    userFindFirst.mockReset();
    userCreate.mockReset();
    userUpdate.mockReset();
    process.env.JWT_SECRET = 'unit-test-main-secret';
  });

  it('邮箱已被占用 → 409，提示指向邮箱且引导登录；不触发 insert（不白耗自增 ID）', async () => {
    userFindFirst.mockResolvedValue({ username: 'someone_else', email: 'taken@example.com' });

    const err = await captureRejection(
      service.register({ username: 'newbie', email: 'taken@example.com', password: 'StrongPass1' }),
    );

    expect(err).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect((err as Error).message).toContain('邮箱');
    expect((err as Error).message).toContain('登录');
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('用户名已被占用 → 409，提示指向用户名；不误报邮箱', async () => {
    userFindFirst.mockResolvedValue({ username: 'newbie', email: 'someone_else@example.com' });

    const err = await captureRejection(
      service.register({ username: 'newbie', email: 'fresh@example.com', password: 'StrongPass1' }),
    );

    expect(err).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect((err as Error).message).toContain('用户名');
    expect((err as Error).message).not.toContain('邮箱');
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('用户名与邮箱都空闲 → 201 契约：返回 token + user（且不泄漏 password）', async () => {
    userFindFirst.mockResolvedValue(null);
    userCreate.mockResolvedValue(CREATED_ROW);

    const out = await service.register({
      username: 'newbie',
      email: 'newbie@example.com',
      password: 'StrongPass1',
    });

    expect(out.token).toBeTruthy();
    expect(out.user).not.toHaveProperty('password');
    expect(out.user).toMatchObject({ id: 7, username: 'newbie', email: 'newbie@example.com' });
    expect(userCreate).toHaveBeenCalledOnce();
  });

  it('预检查通过但插入时被并发抢占（P2002）→ 仍归 409 并给字段提示', async () => {
    userFindFirst.mockResolvedValue(null);
    userCreate.mockRejectedValue(p2002('users_email_key'));

    const err = await captureRejection(
      service.register({ username: 'newbie', email: 'newbie@example.com', password: 'StrongPass1' }),
    );

    expect(err).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect((err as Error).message).toContain('邮箱');
  });

  it('非唯一冲突的数据库错误原样抛出（不被误吞成 409）', async () => {
    userFindFirst.mockResolvedValue(null);
    userCreate.mockRejectedValue(new Error('connection lost'));

    await expect(
      service.register({ username: 'newbie', email: 'newbie@example.com', password: 'StrongPass1' }),
    ).rejects.toThrow('connection lost');
  });
});

describe('auth.service.updateProfile · 占用预检查需排除自己', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    userFindFirst.mockReset();
    userCreate.mockReset();
    userUpdate.mockReset();
    process.env.JWT_SECRET = 'unit-test-main-secret';
  });

  it('改成别人已用的邮箱 → 409 且提示邮箱', async () => {
    userFindUnique.mockResolvedValue(CREATED_ROW);
    userFindFirst.mockResolvedValue({ username: 'other', email: 'taken@example.com' });

    const err = await captureRejection(service.updateProfile(7, { email: 'taken@example.com' }));

    expect(err).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect((err as Error).message).toContain('邮箱');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('查询冲突时必须排除自己（否则提交未改动的原值会被误判）', async () => {
    userFindUnique.mockResolvedValue(CREATED_ROW);
    userFindFirst.mockResolvedValue(null);
    userUpdate.mockResolvedValue(CREATED_ROW);

    const out = await service.updateProfile(7, {
      username: 'newbie',
      email: 'newbie@example.com',
    });

    expect(out.user.username).toBe('newbie');
    expect(userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: 7 } }) }),
    );
  });

  it('用户不存在 → 404，且不做无谓的占用查询', async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(service.updateProfile(999, { username: 'whatever' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(userFindFirst).not.toHaveBeenCalled();
  });
});
