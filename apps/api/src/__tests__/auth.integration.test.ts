import 'dotenv/config';
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';

describe('POST /api/auth/register', () => {
  it('合法输入返回 201 + user data + token', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@t.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // register 契约已对齐 login：返回 { token, user }
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@t.com');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('重复邮箱返回 409 CONFLICT', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'testuser2', email: 'test@t.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('POST /api/auth/login', () => {
  it('正确凭据返回 token', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@t.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('错误密码返回 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@t.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: ['test@t.com', 'test2@t.com'] } } });
  await prisma.$disconnect();
});
