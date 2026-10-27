import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// 认证中间件 mock（auth 中间件依赖 prisma+JWT，路由测试只验证市场逻辑本身；
// 未认证 401 行为由 auth 中间件自身的集成测试覆盖）
vi.mock('../middleware/auth', () => ({
  auth: (req: { userId?: number; userRole?: string }, _res: unknown, next: () => void) => {
    req.userId = 1;
    req.userRole = 'user';
    next();
  },
}));

import { createPluginsRouter } from './plugins.routes.js';
import { errorHandler } from '../middleware/error.js';

/**
 * 插件市场路由测试（S4 Task 12）。
 * fixture 全部在 os.tmpdir() 随机目录，不读写仓库真实 plugins/installed.json。
 */
let pluginsDir: string;
let server: ReturnType<typeof express>;

const helloWorldManifest = {
  id: 'hello-world',
  name: 'Hello World',
  version: '1.0.0',
  author: 'dm-team',
  description: 'Demo plugin: adds a menu item + listens to download events',
  type: 'ui',
  permissions: [{ type: 'ui', inject: ['menu'] }],
  entry: 'index.js',
};

beforeAll(async () => {
  pluginsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dm-plugins-routes-'));
  const pluginDir = path.join(pluginsDir, 'hello-world');
  await fs.mkdir(pluginDir, { recursive: true });
  await fs.writeFile(path.join(pluginDir, 'manifest.json'), JSON.stringify(helloWorldManifest, null, 2), 'utf-8');
  await fs.writeFile(
    path.join(pluginsDir, 'installed.json'),
    JSON.stringify({
      'hello-world': {
        version: '1.0.0',
        path: 'hello-world/',
        enabled: true,
        approvedAt: '2026-08-26T00:00:00.000Z',
        state: 'activated',
        lastError: null,
      },
    }),
    'utf-8',
  );

  server = express();
  server.use(express.json());
  server.use('/api/plugins', createPluginsRouter(pluginsDir));
  // AppError → 统一错误信封（与 app.ts 一致；缺它则错误落到 Express 默认 500 HTML）
  server.use(errorHandler);
});

afterAll(async () => {
  await fs.rm(pluginsDir, { recursive: true, force: true });
});

describe('plugins 市场路由骨架', () => {
  it('GET /api/plugins/registry 返回官方注册表（含 hello-world）', async () => {
    const res = await request(server).get('/api/plugins/registry');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plugins[0].id).toBe('hello-world');
    expect(res.body.timestamp).toBeTruthy();
  });

  it('GET /api/plugins/registry/hello-world 返回本地 manifest', async () => {
    const res = await request(server).get('/api/plugins/registry/hello-world');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('hello-world');
    expect(res.body.data.permissions).toEqual([{ type: 'ui', inject: ['menu'] }]);
  });

  it('GET /api/plugins/registry/:id 未知插件返回 404 NOT_FOUND 信封', async () => {
    const res = await request(server).get('/api/plugins/registry/no-such-plugin');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/plugins/installed 返回 installed.json 内容', async () => {
    const res = await request(server).get('/api/plugins/installed');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('hello-world');
    expect(res.body.data['hello-world'].enabled).toBe(true);
  });

  it('POST /api/plugins/install 有效 id 返回 manifest 供授权', async () => {
    const res = await request(server).post('/api/plugins/install').send({ id: 'hello-world', version: '1.0.0' });
    expect(res.status).toBe(200);
    expect(res.body.data.manifest.id).toBe('hello-world');
  });

  it('POST /api/plugins/install 版本不匹配返回 400 VERSION_MISMATCH', async () => {
    const res = await request(server).post('/api/plugins/install').send({ id: 'hello-world', version: '9.9.9' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERSION_MISMATCH');
  });

  it('POST /api/plugins/install 缺少 id 返回 400 校验错误', async () => {
    const res = await request(server).post('/api/plugins/install').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/plugins/install 非法 id（路径穿越）返回 400', async () => {
    const res = await request(server).post('/api/plugins/install').send({ id: '../secrets' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/plugins/:id/enable 返回 501 NOT_IMPLEMENTED（v3.1.0 骨架语义）', async () => {
    const res = await request(server).post('/api/plugins/hello-world/enable');
    expect(res.status).toBe(501);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });
});
