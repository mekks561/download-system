/**
 * 路由 ↔ OpenAPI 双向覆盖审计（S3 Task 3）：
 * 遍历 Express app 实际注册的全部 /api 路由，断言：
 *  1. 每个真实路由（method+path）在 openapi.json 都有条目；
 *  2. openapi.json 里每个 /api 条目都能在 Express 找到对应路由（防陈旧文档）。
 *
 * 不发请求、不依赖数据库；只读取 router 内部注册表。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Express } from 'express';
import { app } from '../app.js';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

interface ExpressLayer {
  name: string;
  regexp: RegExp;
  route?: { path: string | string[]; methods: Record<string, boolean> };
  handle?: ((...args: unknown[]) => unknown) & { stack?: ExpressLayer[] };
}

/** 从 path-to-regexp v0 的挂载正则还原固定前缀（本应用挂载点均为静态字符串） */
function decodeMountPrefix(regexp: RegExp): string {
  let src = regexp.source;
  src = src.replace(/^\^/, '');
  src = src.replace(/\\\/\?\(\?=\\\/\|\$\)$/, '');
  src = src.replace(/\\\//g, '/');
  return src;
}

/** Express :id 风格参数 → OpenAPI {id} */
function toOpenApiPath(expressPath: string): string {
  const p = expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

/** 遍历 app，收集所有 /api 下的 METHOD PATH */
function collectExpressRoutes(expressApp: Express): Set<string> {
  const found = new Set<string>();

  const walk = (router: { stack: ExpressLayer[] }, prefix: string) => {
    for (const layer of router.stack) {
      // 挂载的子 router（app.use('/api/xxx', subRouter)）
      if (layer.name === 'router' && layer.handle?.stack) {
        const mount = decodeMountPrefix(layer.regexp);
        if (mount.startsWith('/api')) {
          walk({ stack: layer.handle.stack }, prefix + mount);
        }
        continue;
      }
      // 直接注册在 router 上的路由
      if (layer.route) {
        const rawPath = Array.isArray(layer.route.path)
          ? layer.route.path[0]
          : layer.route.path;
        const fullPath = toOpenApiPath(prefix + rawPath);
        for (const [method, enabled] of Object.entries(layer.route.methods)) {
          if (enabled && HTTP_METHODS.has(method)) {
            found.add(`${method.toUpperCase()} ${fullPath}`);
          }
        }
      }
    }
  };

  const root = (expressApp as unknown as { _router: { stack: ExpressLayer[] } })._router;
  walk(root, '');
  return found;
}

describe('Express 路由 ↔ openapi.json 覆盖度', () => {
  const openapi = JSON.parse(
    readFileSync(join(process.cwd(), 'openapi.json'), 'utf-8'),
  ) as {
    paths: Record<string, Record<string, unknown>>;
  };

  const expressRoutes = collectExpressRoutes(app);

  const openApiRoutes = new Set<string>();
  for (const [path, ops] of Object.entries(openapi.paths)) {
    if (!path.startsWith('/api/')) continue;
    for (const method of Object.keys(ops)) {
      if (HTTP_METHODS.has(method)) openApiRoutes.add(`${method.toUpperCase()} ${path}`);
    }
  }

  it('Express 实际注册的每个 /api 路由都在 openapi.json 中有条目', () => {
    const missing = [...expressRoutes].filter((r) => !openApiRoutes.has(r));
    expect(missing.sort()).toEqual([]);
  });

  it('openapi.json 中没有指向不存在路由的陈旧条目', () => {
    const stale = [...openApiRoutes].filter((r) => !expressRoutes.has(r));
    expect(stale.sort()).toEqual([]);
  });

  it('两端点数量一致且为 102', () => {
    expect(expressRoutes.size).toBe(102);
    expect(openApiRoutes.size).toBe(102);
  });
});
