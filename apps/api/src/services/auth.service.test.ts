import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * 主站 auth.service 安全回归（mock prisma，不连库）：
 * S3 Task 4 起邮箱不存在也必须走一次 bcrypt.compare（dummy hash），
 * 与密码错误路径保持等时，避免账号枚举时序侧信。
 */
const { userFindUnique } = vi.hoisted(() => ({ userFindUnique: vi.fn() }));

vi.mock('../config/prisma', () => ({
  prisma: { user: { findUnique: userFindUnique } },
}));

import bcrypt from 'bcryptjs';
import * as service from './auth.service';

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
