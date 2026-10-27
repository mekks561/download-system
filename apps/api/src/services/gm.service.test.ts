import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * gm.service 安全回归（mock prisma，不连库）：
 * 用户名不存在时也必须执行一次 bcrypt.compare（与密码错误路径等时），
 * 避免通过响应时序差异枚举 gm_users 账号是否存在。
 */
const { gmFindUnique, mockPluginHost } = vi.hoisted(() => ({
  gmFindUnique: vi.fn(),
  mockPluginHost: {
    listAll: vi.fn(),
    toggle: vi.fn(),
    uninstall: vi.fn(),
  },
}));

vi.mock('../config/prisma', () => ({
  prisma: { gmUser: { findUnique: gmFindUnique } },
}));

vi.mock('../config/plugin-host', () => ({
  pluginHost: mockPluginHost,
}));

import bcrypt from 'bcryptjs';
import { pluginHost } from '../config/plugin-host.js';
import * as service from './gm.service.js';

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

describe('gm.service 插件管理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listPlugins 调用 pluginHost.listAll', async () => {
    const mockPlugins = [{ id: 'test', version: '1.0.0', enabled: true }];
    vi.mocked(pluginHost.listAll).mockResolvedValue(mockPlugins as any);

    const result = await service.listPlugins();
    expect(result).toEqual(mockPlugins);
    expect(pluginHost.listAll).toHaveBeenCalledOnce();
  });

  it('togglePlugin 调用 pluginHost.toggle', async () => {
    await service.togglePlugin('test-plugin', false);
    expect(pluginHost.toggle).toHaveBeenCalledWith('test-plugin', false);
  });

  it('uninstallPlugin 调用 pluginHost.uninstall', async () => {
    await service.uninstallPlugin('test-plugin');
    expect(pluginHost.uninstall).toHaveBeenCalledWith('test-plugin');
  });
});
