import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { DownloadSchema } from '@dm/shared';

const TEST_EMAIL = 'dl-integration@t.com';
const TEST_PASSWORD = 'password123';
let token: string;
let createdDownloadId: number;

beforeAll(async () => {
  // 确保旧数据清理干净（避免重复注册导致 409）
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await request(app).post('/api/auth/register').send({
    username: 'dl_integration',
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  const loginRes = await request(app).post('/api/auth/login').send({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  token = loginRes.body.data.token;
});

afterAll(async () => {
  await prisma.download.deleteMany({
    where: { user: { email: TEST_EMAIL } },
  });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

describe('Download API 集成测试', () => {
  it('POST /api/downloads 无 token 返回 401', async () => {
    const res = await request(app)
      .post('/api/downloads')
      .send({ url: 'https://example.com/file.zip' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/downloads 带 token 返回 201 + DownloadSchema 兼容数据', async () => {
    const res = await request(app)
      .post('/api/downloads')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/file.zip', filename: 'file.zip' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(() => DownloadSchema.parse(res.body.data)).not.toThrow();
    createdDownloadId = res.body.data.id;
  });

  it('GET /api/downloads 返回下载列表', async () => {
    const res = await request(app)
      .get('/api/downloads')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((d: { id: number }) => d.id === createdDownloadId)).toBe(true);
  });

  it('POST /api/downloads 非法 URL 返回 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/downloads')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'not-a-valid-url' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/downloads/:id/pause 更新状态为 paused', async () => {
    const res = await request(app)
      .post(`/api/downloads/${createdDownloadId}/pause`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('paused');
  });

  it('DELETE /api/downloads/:id 删除下载记录', async () => {
    const res = await request(app)
      .delete(`/api/downloads/${createdDownloadId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
  });
});
