import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

/**
 * m1 回归：express.json() 解析 body 失败（malformed JSON）必须返回 400 信封，
 * 而不是落进 500 INTERNAL_ERROR。解析在路由/控制器之前失败，故不依赖数据库。
 */
describe('HTTP 错误信封 · malformed JSON（m1）', () => {
  const MALFORMED = '{invalid json';

  it('POST /api/auth/setup 收到非法 JSON → 400 VALIDATION_ERROR（非 500）', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .set('Content-Type', 'application/json')
      .send(MALFORMED);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/login 收到非法 JSON → 400 VALIDATION_ERROR（非 500）', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(MALFORMED);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('合法 JSON 但字段不满足契约 → 仍是 400 VALIDATION_ERROR（既有行为不回归）', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'not-an-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
