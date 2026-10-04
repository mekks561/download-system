import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * gm.service 安全回归（mock prisma，不连库）：
 * 用户名不存在时也必须执行一次 bcrypt.compare（与密码错误路径等时），
 * 避免通过响应时序差异枚举 gm_users 账号是否存在。
 */
const { gmFindUnique } = vi.hoisted(() => ({ gmFindUnique: vi.fn() }));

vi.mock('../config/prisma', () => ({
  prisma: { gmUser: { findUnique: gmFindUnique } },
}));

import bcrypt from 'bcryptjs';
import * as service from './gm.service';

describe('gm.service.login 常量时间失败', () => {
  beforeEach(() => {
    gmFindUnique.mockReset();
    vi.restoreAllMocks();
    process.env.GM_JWT_SECRET = 'unit-test-gm-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('用户名不存在：仍调用 bcrypt.compare（dummy hash），统一 401 INVALID_CREDENTIALS', async () => {
    gmFindUnique.mockResolvedValue(null);
    const compareSpy = vi.spyOn(bcrypt, 'compare');

    await expect(
      service.login({ username: 'ghost_zzz', password: 'whatever12' }),
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });

    expect(compareSpy).toHaveBeenCalledOnce();
  });

  it('密码错误：同样 401 INVALID_CREDENTIALS，且不签发 token', async () => {
    gmFindUnique.mockResolvedValue({
      id: 1,
      username: 'gm',
      role: 'admin',
      password: await bcrypt.hash('correct-horse', 10),
    });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      service.login({ username: 'gm', password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });
});
