import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

// 单元测试隔离数据库：setup 会写 users 表，直接打真库会污染开发数据
vi.mock('../config/prisma', () => ({
  prisma: {
    user: { count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../config/prisma.js';
import { setupAdmin, getSetupStatus, isUsersTableEmpty, skipSetup } from './setup.service.js';

const mock = prisma as unknown as {
  user: { count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

/** 模拟事务：直接把 mock 自身当作 tx 传回去，验证「check + create 同事务」的调用形态 */
function stubTransaction() {
  mock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
}

/** 构造 Prisma 已知错误（并发败者在真库里会收到的形态） */
function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`db error ${code}`, {
    code,
    clientVersion: '6.19.3',
  });
}

const fakeRow = {
  id: 1,
  username: 'admin01',
  email: 'admin@dm.local',
  password: 'hashed',
  role: 'admin' as const,
  createdAt: new Date('2026-09-30T00:00:00.000Z'),
  updatedAt: new Date('2026-09-30T00:00:00.000Z'),
};

describe('setup.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubTransaction();
  });

  it('isUsersTableEmpty：count 为 0 时返回 true', async () => {
    mock.user.count.mockResolvedValue(0);
    await expect(isUsersTableEmpty()).resolves.toBe(true);
  });

  it('isUsersTableEmpty：存在用户时返回 false', async () => {
    mock.user.count.mockResolvedValue(7);
    await expect(isUsersTableEmpty()).resolves.toBe(false);
  });

  it('getSetupStatus：只返回布尔值，不泄露用户数量', async () => {
    mock.user.count.mockResolvedValue(3);
    const status = await getSetupStatus();
    expect(status).toEqual({ needsSetup: false });
    expect(Object.keys(status)).toEqual(['needsSetup']);
  });

  it('表为空时创建 admin，返回 token + 用户信息（不含密码）', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue(fakeRow);

    const result = await setupAdmin({
      username: 'admin01',
      email: 'admin@dm.local',
      password: 'StrongPass123',
    });

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('admin@dm.local');
    expect(result.user).not.toHaveProperty('password');
  });

  it('写入的角色固定为 admin，且密码以 bcrypt 哈希落库（非明文）', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue(fakeRow);

    await setupAdmin({
      username: 'admin01',
      email: 'admin@dm.local',
      password: 'StrongPass123',
    });

    const arg = mock.user.create.mock.calls[0]![0] as { data: { role: string; password: string } };
    expect(arg.data.role).toBe('admin');
    expect(arg.data.password).not.toBe('StrongPass123');
    await expect(bcrypt.compare('StrongPass123', arg.data.password)).resolves.toBe(true);
  });

  it('判定与写入在同一 Serializable 事务内完成（防并发重复初始化）', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue(fakeRow);

    await setupAdmin({ username: 'admin01', email: 'a@b.com', password: 'StrongPass123' });

    expect(mock.$transaction).toHaveBeenCalledTimes(1);
    // count 必须发生在事务内部（通过 tx 调用），否则并发下两人都能通过空表检查
    expect(mock.user.count).toHaveBeenCalledTimes(1);
    expect(mock.user.create).toHaveBeenCalledTimes(1);
    // M1：必须显式要求 Serializable，默认隔离级别挡不住两个同时通过的空表检查
    expect(mock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('已存在用户时抛 409 CONFLICT，且不创建任何账号', async () => {
    mock.user.count.mockResolvedValue(2);

    await expect(
      setupAdmin({ username: 'admin01', email: 'a@b.com', password: 'StrongPass123' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });

    expect(mock.user.create).not.toHaveBeenCalled();
  });
});

describe('setup.service · 跳过向导', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubTransaction();
  });

  it('创建默认 admin 并回传一次性随机密码', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue({ ...fakeRow, username: 'admin' } as never);

    const result = await skipSetup();

    expect(result.user.username).toBe('admin');
    expect(result.user.email).toBe('admin@dm.local');
    expect(result.generatedPassword).toHaveLength(16);
    expect(result.mustChangePassword).toBe(true);
    expect(result.token).toBeTruthy();
  });

  it('落库的是随机密码的 bcrypt 密文，而非明文', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue({ ...fakeRow, username: 'admin' } as never);

    const result = await skipSetup();
    const arg = mock.user.create.mock.calls[0]![0] as { data: { password: string } };

    expect(arg.data.password).not.toBe(result.generatedPassword);
    await expect(bcrypt.compare(result.generatedPassword, arg.data.password)).resolves.toBe(true);
  });

  it('两次跳过的密码不同（不存在硬编码默认口令）', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue({ ...fakeRow, username: 'admin' } as never);

    const a = await skipSetup();
    const b = await skipSetup();

    expect(a.generatedPassword).not.toBe(b.generatedPassword);
  });

  it('已初始化时同样拒绝（不因「跳过」绕过首次校验）', async () => {
    mock.user.count.mockResolvedValue(1);

    await expect(skipSetup()).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(mock.user.create).not.toHaveBeenCalled();
  });

  it('skipSetup 同样以 Serializable 隔离级别开启事务', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue({ ...fakeRow, username: 'admin' } as never);

    await skipSetup();

    expect(mock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });
});

describe.each(['setupAdmin', 'skipSetup'] as const)(
  'setup.service · %s 并发败者错误归一为 409（M1）',
  (fnName) => {
    const invoke = () =>
      fnName === 'setupAdmin'
        ? setupAdmin({ username: 'admin01', email: 'a@b.com', password: 'StrongPass123' })
        : skipSetup();

    beforeEach(() => {
      vi.clearAllMocks();
      stubTransaction();
    });

    it.each(['P2002', 'P2034', 'P2010'] as const)(
      '%s（唯一冲突/序列化失败/底层锁失败）统一抛 409 CONFLICT，不漏成 500',
      async (code) => {
        mock.$transaction.mockRejectedValueOnce(knownError(code));

        await expect(invoke()).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
        expect(mock.user.create).not.toHaveBeenCalled();
      },
    );

    it('非并发冲突类的 Prisma 错误原样抛出（不被误判为已初始化）', async () => {
      mock.$transaction.mockRejectedValueOnce(knownError('P2024'));

      await expect(invoke()).rejects.toMatchObject({ code: 'P2024' });
    });
  },
);
