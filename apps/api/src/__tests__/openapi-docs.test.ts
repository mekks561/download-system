import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

/**
 * Swagger UI 挂载回归（S3 Task 3）：/docs 返回可交互文档页。
 * 不依赖数据库。openapi.json 缺失时 app 会跳过挂载，此测试即为挂载证据。
 */
describe('Swagger UI · GET /docs', () => {
  it('GET /docs/ → 200 HTML 页面（含 swagger-ui 与标题）', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
    expect(res.text).toContain('Download Manager API');
  });

  it('页面带允许内联脚本的 CSP（Swagger UI 初始化脚本需要）', async () => {
    const res = await request(app).get('/docs/');
    const csp = res.headers['content-security-policy'] as string | undefined;
    expect(csp).toBeTruthy();
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  });
});
