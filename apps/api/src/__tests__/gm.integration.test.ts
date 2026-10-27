import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import { isDatabaseAvailable } from './helpers/db.js';
import gmRouter from '../routes/gm.routes.js';

/**
 * S3 Task 4 B-lite · GM 独立账号体系端到端集成测试（真 MySQL 3306，不 mock）。
 *
 * 覆盖：
 * - GM 登录成功/失败（不区分用户名与密码错误）；登录限流挂载（静态断言，避免触发 10 次锁死）
 * - 无 token / 主站用户 token 访问 GM 路由 → 401；GM token 访问主站路由 → 401
 * - 用户列表分页/搜索、password 不外泄
 * - 重置主站用户密码后，用新密码走主站 /api/auth/login 登录成功
 * - PATCH isActive=false 后该用户主站登录被拒
 * - GM 自我保护：同名主站管理员不可被降级/禁用 → 400
 * - 强制取消下载：非终态 200、重复取消 409、已完成 409
 * - 仪表盘 200 + 最近 7 天日序列
 *
 * 数据安全：全部使用 gm-it-* 前缀的隔离夹具，afterAll 删除夹具行及其级联数据，
 * 不修改任何既有账号（不做全库 wipe）。
 */
const dbAvailable = isDatabaseAvailable();

const GM_ADMIN = { username: 'gm_it_admin', password: 'GmPass123!' };
const USERS = {
  search1: { username: 'gmitsearchzz1', email: 'gm-it-search1@t.com', password: 'SearchPass1' },
  search2: { username: 'gmitsearchzz2', email: 'gm-it-search2@t.com', password: 'SearchPass2' },
  search3: { username: 'gmitsearchzz3', email: 'gm-it-search3@t.com', password: 'SearchPass3' },
  reset: { username: 'gmresetuser', email: 'gm-it-reset@t.com', password: 'OldPass12345' },
  disable: { username: 'gmdisableuser', email: 'gm-it-disable@t.com', password: 'DisablePass1' },
  self: { username: GM_ADMIN.username, email: 'gm-it-self@t.com', password: 'SelfPass1234' },
  download: { username: 'gmdluser', email: 'gm-it-dl@t.com', password: 'DlPass12345' },
};
const FIXTURE_EMAILS = Object.values(USERS).map((u) => u.email);

let gmToken: string;
let downloadUserId: number;

function gmGet(path: string, token?: string) {
  return request(app)
    .get(path)
    .set('Authorization', `Bearer ${token ?? gmToken}`);
}

describe.skipIf(!dbAvailable)('GM 管理后台 API（独立 gm_users / 独立 GM JWT）', () => {
  beforeAll(async () => {
    // GM 账号（独立表）
    await prisma.gmUser.deleteMany({ where: { username: GM_ADMIN.username } });
    await prisma.gmUser.create({
      data: {
        username: GM_ADMIN.username,
        password: await bcrypt.hash(GM_ADMIN.password, 10),
        role: 'admin',
      },
    });

    // 主站夹具用户
    await prisma.user.deleteMany({ where: { email: { in: FIXTURE_EMAILS } } });
    for (const u of Object.values(USERS)) {
      await prisma.user.create({
        data: {
          username: u.username,
          email: u.email,
          password: await bcrypt.hash(u.password, 10),
        },
      });
    }
    const dlUser = await prisma.user.findUnique({ where: { email: USERS.download.email } });
    downloadUserId = dlUser!.id;
    // 预置 2 条下载供列表过滤断言（cancel 用例还会再建 2 条，级联清理统一回收）
    await prisma.download.createMany({
      data: [
        { userId: downloadUserId, url: 'https://example.com/a.zip', filename: 'a.zip', status: 'completed' },
        { userId: downloadUserId, url: 'https://example.com/b.zip', filename: 'b.zip', status: 'downloading' },
      ],
    });
  });

  afterAll(async () => {
    const deletedDownloads = await prisma.download.deleteMany({ where: { userId: downloadUserId } });
    const deletedUsers = await prisma.user.deleteMany({ where: { email: { in: FIXTURE_EMAILS } } });
    const deletedGm = await prisma.gmUser.deleteMany({ where: { username: GM_ADMIN.username } });
    console.log(
      `[gm-it] 夹具清理: users=${deletedUsers.count}, downloads=${deletedDownloads.count}, gmUsers=${deletedGm.count}`,
    );
    // 恢复自检：夹具行应全部消失
    const leftover = await prisma.user.count({ where: { email: { in: FIXTURE_EMAILS } } });
    const gmLeft = await prisma.gmUser.count({ where: { username: GM_ADMIN.username } });
    expect(leftover).toBe(0);
    expect(gmLeft).toBe(0);
    await prisma.$disconnect();
  });

  describe('POST /api/gm/auth/login', () => {
    it('登录限流器已挂载（路由栈含 limiter+validate+controller ≥3 个处理器）', () => {
      const stack = (gmRouter as unknown as {
        stack: Array<{
          route?: { path: string; methods: Record<string, boolean>; stack: unknown[] };
        }>;
      }).stack;
      const layer = stack.find(
        (l) => l.route?.path === '/auth/login' && l.route.methods.post === true,
      );
      expect(layer).toBeTruthy();
      // 每个挂载的中间件在 route.stack 占一项
      expect(layer!.route!.stack.length).toBeGreaterThanOrEqual(3);
    });

    it('正确凭据返回 200 + GM token + gmUser（不含 password）', async () => {
      const res = await request(app).post('/api/gm/auth/login').send(GM_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.gmUser).toMatchObject({ username: GM_ADMIN.username, role: 'admin' });
      expect(res.body.data.gmUser.password).toBeUndefined();
      gmToken = res.body.data.token;
    });

    it('错误密码返回 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/gm/auth/login')
        .send({ username: GM_ADMIN.username, password: 'wrong-password' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('不存在的用户名同样 401 INVALID_CREDENTIALS（不暴露账号是否存在）', async () => {
      const res = await request(app)
        .post('/api/gm/auth/login')
        .send({ username: 'nobody_zzz', password: 'whatever12' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('缺字段返回 400 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/gm/auth/login').send({ username: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('JWT 隔离', () => {
    it('无 token 访问 GET /api/gm/users → 401', async () => {
      const res = await request(app).get('/api/gm/users');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('【安全隔离】主站用户 JWT 访问 GM 路由 → 401', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: USERS.search1.email, password: USERS.search1.password });
      const mainToken = login.body.data.token;
      const res = await request(app)
        .get('/api/gm/dashboard')
        .set('Authorization', `Bearer ${mainToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('【反向隔离】GM JWT 访问主站 /api/auth/profile → 401', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${gmToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/gm/dashboard', () => {
    it('返回四类总数 + 最近 7 天每日下载序列', async () => {
      const res = await gmGet('/api/gm/dashboard');
      expect(res.status).toBe(200);
      const d = res.body.data;
      for (const k of ['userCount', 'downloadCount', 'uploadCount', 'fileCount']) {
        expect(typeof d[k]).toBe('number');
      }
      expect(d.dailyDownloads).toHaveLength(7);
      expect(d.dailyDownloads[6]).toHaveProperty('date');
      expect(typeof d.dailyDownloads[6].downloads).toBe('number');
    });
  });

  describe('GET /api/gm/users', () => {
    it('分页信封 + 搜索命中夹具用户 + 不泄露 password', async () => {
      const res = await gmGet('/api/gm/users?search=gmitsearchzz&page=1&pageSize=2');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(2);
      expect(res.body.data.users).toHaveLength(2);
      for (const u of res.body.data.users) {
        expect(u.password).toBeUndefined();
        expect(u.username).toMatch(/gmitsearchzz/);
      }
    });

    it('第 2 页返回剩余 1 条', async () => {
      const res = await gmGet('/api/gm/users?search=gmitsearchzz&page=2&pageSize=2');
      expect(res.status).toBe(200);
      expect(res.body.data.users).toHaveLength(1);
    });

    it('pageSize>100 被 query 校验拒绝 → 400', async () => {
      const res = await gmGet('/api/gm/users?pageSize=101');
      expect(res.status).toBe(400);
    });

    it('role 过滤 user/admin', async () => {
      const res = await gmGet('/api/gm/users?role=user&search=gmitsearchzz');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      const bad = await gmGet('/api/gm/users?role=root');
      expect(bad.status).toBe(400);
    });
  });

  describe('PATCH /api/gm/users/:id', () => {
    it('禁用闭环：登录被拒 + 禁用前签发的 JWT 立即失效 + 恢复后同令牌复活', async () => {
      const target = await prisma.user.findUnique({ where: { email: USERS.disable.email } });

      // 禁用前先登录拿到 JWT，并证明它当前可访问受保护端点
      const before = await request(app)
        .post('/api/auth/login')
        .send({ email: USERS.disable.email, password: USERS.disable.password });
      expect(before.status).toBe(200);
      const liveToken = before.body.data.token;
      const profileBefore = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${liveToken}`);
      expect(profileBefore.status).toBe(200);

      // GM 禁用该主站用户
      const res = await request(app)
        .patch(`/api/gm/users/${target!.id}`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ isActive: false });
      expect(res.status).toBe(200);
      expect(res.body.data.user.isActive).toBe(false);

      // 闭环 1：禁用后重新登录被拒（401 ACCOUNT_DISABLED）
      const loginAfter = await request(app)
        .post('/api/auth/login')
        .send({ email: USERS.disable.email, password: USERS.disable.password });
      expect(loginAfter.status).toBe(401);
      expect(loginAfter.body.error.code).toBe('ACCOUNT_DISABLED');

      // 闭环 2：禁用前已签发、尚未过期的 JWT 再访问受保护端点也必须被拒
      // （auth 中间件不能只验签，必须查库确认 isActive）
      const profileBlocked = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${liveToken}`);
      expect(profileBlocked.status).toBe(401);
      expect(profileBlocked.body.error.code).toBe('ACCOUNT_DISABLED');

      // 恢复启用：同一 JWT 立即重新可用（无需重新登录）
      await request(app)
        .patch(`/api/gm/users/${target!.id}`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ isActive: true });
      const profileAgain = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${liveToken}`);
      expect(profileAgain.status).toBe(200);
    });

    it('GM 自我保护：同名主站管理员被禁用/降级 → 400', async () => {
      const self = await prisma.user.findUnique({ where: { email: USERS.self.email } });
      const disable = await request(app)
        .patch(`/api/gm/users/${self!.id}`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ isActive: false });
      expect(disable.status).toBe(400);
      expect(disable.body.error.code).toBe('GM_SELF_PROTECTION');

      const demote = await request(app)
        .patch(`/api/gm/users/${self!.id}`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ role: 'user' });
      expect(demote.status).toBe(400);
    });

    it('白名单防 mass assignment：传 password 字段 → 400（strict schema）', async () => {
      const target = await prisma.user.findUnique({ where: { email: USERS.search1.email } });
      const res = await request(app)
        .patch(`/api/gm/users/${target!.id}`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ password: 'Hacked12345' });
      expect(res.status).toBe(400);
    });

    it('不存在的用户 → 404', async () => {
      const res = await request(app)
        .patch('/api/gm/users/99999999')
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/gm/users/:id/reset-password', () => {
    it('重置后用新密码走主站登录成功；旧密码失效', async () => {
      const target = await prisma.user.findUnique({ where: { email: USERS.reset.email } });
      const res = await request(app)
        .post(`/api/gm/users/${target!.id}/reset-password`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ newPassword: 'NewPass12345' });
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();

      const okLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: USERS.reset.email, password: 'NewPass12345' });
      expect(okLogin.status).toBe(200);
      expect(okLogin.body.data.token).toBeTruthy();

      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: USERS.reset.email, password: USERS.reset.password });
      expect(oldLogin.status).toBe(401);

      // DB 中必须是 bcrypt hash（$2 前缀），绝不能落明文
      const row = await prisma.user.findUnique({ where: { email: USERS.reset.email } });
      expect(row!.password).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(row!.password).not.toBe('NewPass12345');
    });

    it('弱新密码（<8）→ 400', async () => {
      const target = await prisma.user.findUnique({ where: { email: USERS.reset.email } });
      const res = await request(app)
        .post(`/api/gm/users/${target!.id}/reset-password`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ newPassword: 'short' });
      expect(res.status).toBe(400);
    });

    it('重置不存在的用户密码 → 404（不泄露其它体系信息）', async () => {
      const res = await request(app)
        .post('/api/gm/users/99999999/reset-password')
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ newPassword: 'Whatever123' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/gm/downloads + 强制取消', () => {
    it('按 userId 过滤分页，include 归属用户名/邮箱', async () => {
      const res = await gmGet(`/api/gm/downloads?userId=${downloadUserId}&pageSize=10`);
      expect(res.status).toBe(200);
      expect(res.body.data.pageSize).toBe(10);
      expect(Array.isArray(res.body.data.downloads)).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
      for (const d of res.body.data.downloads) {
        expect(d.userId).toBe(downloadUserId);
        expect(d.username).toBe(USERS.download.username);
        expect(d.email).toBe(USERS.download.email);
      }
    });

    it('仅 pending/paused 可取消（200→cancelled）；downloading/error/completed/已取消 → 409', async () => {
      const mk = (status: 'pending' | 'paused' | 'downloading' | 'error' | 'completed') =>
        prisma.download.create({
          data: {
            userId: downloadUserId,
            url: `https://example.com/${status}-${Math.random().toString(36).slice(2)}.zip`,
            filename: `${status}.zip`,
            status,
          },
        });
      const [pending, paused, downloading, errored, done] = await Promise.all([
        mk('pending'),
        mk('paused'),
        mk('downloading'),
        mk('error'),
        mk('completed'),
      ]);

      const cancel = (id: number) =>
        request(app)
          .post(`/api/gm/downloads/${id}/cancel`)
          .set('Authorization', `Bearer ${gmToken}`);

      // 唯一合法的取消前态：pending / paused
      const okPending = await cancel(pending.id);
      expect(okPending.status).toBe(200);
      expect(okPending.body.data.download.status).toBe('cancelled');
      const okPaused = await cancel(paused.id);
      expect(okPaused.status).toBe(200);
      expect(okPaused.body.data.download.status).toBe('cancelled');

      // 进行中 / 失败 / 已完成：当前状态不允许 GM 强制取消
      for (const row of [downloading, errored, done]) {
        const r = await cancel(row.id);
        expect(r.status, `status=${row.status} 应当 409`).toBe(409);
        expect(r.body.error.code).toBe('CONFLICT');
      }

      // 终态重复操作：pending 取消后再取消 → 409
      const again = await cancel(pending.id);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('CONFLICT');
    });

    it('取消不存在的下载 → 404', async () => {
      const res = await request(app)
        .post('/api/gm/downloads/99999999/cancel')
        .set('Authorization', `Bearer ${gmToken}`);
      expect(res.status).toBe(404);
    });
  });
});
