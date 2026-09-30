import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// 走真实路由与中间件（含 Zod 校验、错误信封），只把数据库换掉
vi.mock('../config/prisma', () => ({
  prisma: {
    user: { count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { app } from '../app';
import { prisma } from '../config/prisma';

const mock = prisma as unknown as {
  user: { count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const validBody = {
  username: 'admin01',
  email: 'admin@dm.local',
  password: 'StrongPass123',
};

describe('POST /api/auth/setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  });

  it('表为空时返回 201 + token + user（与 /register 契约一致，可直接登入）', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue({
      id: 1,
      username: 'admin01',
      email: 'admin@dm.local',
      password: 'hashed',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post('/api/auth/setup').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.timestamp).toBeTruthy();
  });

  it('已有用户时返回 409 ALREADY_ONBOARDED', async () => {
    mock.user.count.mockResolvedValue(3);

    const res = await request(app).post('/api/auth/setup').send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(mock.user.create).not.toHaveBeenCalled();
  });

  it('非法输入返回 400，且不触碰数据库', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      username: 'ab',
      email: 'not-an-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mock.user.count).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/setup-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('返回 needsSetup=true（未初始化）', async () => {
    mock.user.count.mockResolvedValue(0);
    const res = await request(app).get('/api/auth/setup-status');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ needsSetup: true });
  });

  it('返回 needsSetup=false（已初始化）', async () => {
    mock.user.count.mockResolvedValue(5);
    const res = await request(app).get('/api/auth/setup-status');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ needsSetup: false });
  });
});

describe('POST /api/auth/skip-setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  });

  it('未初始化时返回 201 + 一次性随机密码 + 强制改密标记', async () => {
    mock.user.count.mockResolvedValue(0);
    mock.user.create.mockResolvedValue({
      id: 1,
      username: 'admin',
      email: 'admin@dm.local',
      password: 'hashed',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post('/api/auth/skip-setup').send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.generatedPassword).toHaveLength(16);
    expect(res.body.data.mustChangePassword).toBe(true);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('已初始化时返回 409', async () => {
    mock.user.count.mockResolvedValue(1);

    const res = await request(app).post('/api/auth/skip-setup').send({});

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(mock.user.create).not.toHaveBeenCalled();
  });
});
