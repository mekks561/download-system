import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getGmJwtSecret, signGmToken, requireGmAuth } from './gm-auth';
import { AppError } from '../utils/errors';
import type { GmAuthRequest } from './gm-auth';

/**
 * GM 认证中间件单测：不依赖 DB / Express 监听，直接以 mock req/res/next 驱动。
 * 关键安全断言：主站 JWT_SECRET 签发的 token 在 GM 侧必须验签失败（401）。
 */

const GM_SECRET = 'unit-test-gm-secret';
const MAIN_SECRET = 'unit-test-main-secret';

function mockReq(headers: Record<string, string> = {}): GmAuthRequest {
  return { headers } as unknown as GmAuthRequest;
}

describe('gm-auth 中间件', () => {
  const savedGm = process.env.GM_JWT_SECRET;
  const savedNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.GM_JWT_SECRET = GM_SECRET;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (savedGm === undefined) delete process.env.GM_JWT_SECRET;
    else process.env.GM_JWT_SECRET = savedGm;
    process.env.NODE_ENV = savedNodeEnv;
    vi.restoreAllMocks();
  });

  it('getGmJwtSecret 优先读 GM_JWT_SECRET', () => {
    expect(getGmJwtSecret()).toBe(GM_SECRET);
  });

  it('非生产环境缺失 env 时回退 dev 密钥并 warn 一次', () => {
    delete process.env.GM_JWT_SECRET;
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = getGmJwtSecret();
    const b = getGmJwtSecret();
    expect(a).toBe(b);
    expect(a).toMatch(/dev-only/);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('生产环境缺失 GM_JWT_SECRET 直接抛错（server.ts 监听前调用本函数 → 拒绝启动）', () => {
    delete process.env.GM_JWT_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => getGmJwtSecret()).toThrow(/GM_JWT_SECRET/);
  });

  it('合法 GM token：挂 req.gmUser 并 next() 无错', () => {
    const token = signGmToken({ id: 7, username: 'gm', role: 'admin' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const next = vi.fn() as NextFunction;
    requireGmAuth(req, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
    expect(req.gmUser).toMatchObject({ id: 7, username: 'gm', role: 'admin' });
  });

  it('缺 Authorization 头 → 401 UNAUTHORIZED', () => {
    const req = mockReq();
    const next = vi.fn();
    requireGmAuth(req, {} as Response, next as unknown as NextFunction);
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('非 Bearer 前缀 → 401', () => {
    const req = mockReq({ authorization: 'Basic abc' });
    const next = vi.fn();
    requireGmAuth(req, {} as Response, next as unknown as NextFunction);
    expect((next.mock.calls[0][0] as AppError).status).toBe(401);
  });

  it('过期 GM token → 401', () => {
    const expired = jwt.sign({ id: 1, username: 'gm', role: 'admin' }, GM_SECRET, {
      expiresIn: -10,
    });
    const req = mockReq({ authorization: `Bearer ${expired}` });
    const next = vi.fn();
    requireGmAuth(req, {} as Response, next as unknown as NextFunction);
    expect((next.mock.calls[0][0] as AppError).status).toBe(401);
  });

  it('【安全隔离】主站 JWT_SECRET 签发的 token 访问 GM 路由必须 401', () => {
    const mainToken = jwt.sign({ id: 1, role: 'admin' }, MAIN_SECRET, { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer ${mainToken}` });
    const next = vi.fn();
    requireGmAuth(req, {} as Response, next as unknown as NextFunction);
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
    expect(req.gmUser).toBeUndefined();
  });

  it('纵深防御：载荷缺 username（主站 {id,role} 形态）即便密钥相同也 401', () => {
    // 即便有人误把同一 secret 配成两边一致，主站形态 token 也应因缺 username 被拒
    process.env.GM_JWT_SECRET = MAIN_SECRET;
    const mainShape = jwt.sign({ id: 1, role: 'admin' }, MAIN_SECRET, { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer ${mainShape}` });
    const next = vi.fn();
    requireGmAuth(req, {} as Response, next as unknown as NextFunction);
    expect((next.mock.calls[0][0] as AppError).status).toBe(401);
    expect(req.gmUser).toBeUndefined();
  });
});
