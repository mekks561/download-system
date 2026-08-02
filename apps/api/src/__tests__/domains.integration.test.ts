import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { prisma } from '../config/prisma';

const TEST_EMAIL = 'domains-test@t.com';
const TEST_PASSWORD = 'password123';
const ADMIN_EMAIL = 'admin@dm.local';
const ADMIN_PASSWORD = 'admin123';

let userToken: string;
let adminToken: string;
let fileId: number;
let createdShareId: number;
let createdScheduleId: number;

beforeAll(async () => {
  // 清理旧数据
  await prisma.share.deleteMany({ where: { user: { email: TEST_EMAIL } } }).catch(() => {});
  await prisma.schedule.deleteMany({ where: { user: { email: TEST_EMAIL } } }).catch(() => {});
  await prisma.file.deleteMany({ where: { user: { email: TEST_EMAIL } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } }).catch(() => {});

  // 注册并登录普通用户
  await request(app).post('/api/auth/register').send({
    username: 'domains_test',
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  const userLogin = await request(app).post('/api/auth/login').send({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  userToken = userLogin.body.data.token;

  // 确保管理员存在（兼容 seed 未运行的环境）
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      username: 'admin',
      email: ADMIN_EMAIL,
      password: adminHash,
      role: 'admin',
    },
  });
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  adminToken = adminLogin.body.data.token;

  // 为分享测试创建一个 File 记录
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  const file = await prisma.file.create({
    data: {
      userId: user!.id,
      name: 'share-target.txt',
      path: '/share-target.txt',
      type: 'text/plain',
    },
  });
  fileId = file.id;
});

afterAll(async () => {
  // 清理（user 级联删除 share/schedule/file）
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } }).catch(() => {});
  await prisma.$disconnect();
});

describe('Share / Schedule / Stats / GM 集成测试', () => {
  it('POST /api/shares 创建分享返回 201 + token', async () => {
    const res = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ fileId });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.status).toBe('active');
    createdShareId = res.body.data.id;
  });

  it('POST /api/shares 无 token 返回 401', async () => {
    const res = await request(app).post('/api/shares').send({ fileId });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/schedules 创建调度返回 201', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        url: 'https://example.com/file.zip',
        cron: '0 2 * * *',
        type: 'daily',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isEnabled).toBe(true);
    createdScheduleId = res.body.data.id;
  });

  it('GET /api/stats/overview 返回 200 + 统计数据', async () => {
    const res = await request(app)
      .get('/api/stats/overview')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('downloadCount');
    expect(res.body.data).toHaveProperty('uploadCount');
    expect(res.body.data).toHaveProperty('totalFileSize');
  });

  it('GET /api/gm/dashboard 普通用户返回 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/gm/dashboard')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/gm/dashboard 管理员返回 200', async () => {
    const res = await request(app)
      .get('/api/gm/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('userCount');
    expect(res.body.data).toHaveProperty('downloadCount');
  });
});
