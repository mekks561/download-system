import { Router, type Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { resolvePluginsDir } from '../plugins/paths';

/**
 * 插件市场路由骨架（S4 Task 12）。
 *
 * v3.1.0 范围（docs/plugins/05-marketplace.md）：注册表静态返回 [hello-world]，
 * install 走本地 plugins/<id>/ 目录（无远端下载），enable/disable/uninstall
 * 完整交互随市场前端在 v3.2.0 落地（enable 当前明确 501）。
 * 全部端点要求主站认证（Bearer JWT，与主站 JWT_SECRET 一致）。
 */

/** 官方注册表（MVP 静态索引；v3.2.0 起从远端 registry 拉取） */
const OFFICIAL_REGISTRY = [
  {
    id: 'hello-world',
    name: 'Hello World',
    version: '1.0.0',
    author: 'dm-team',
    description: 'Demo plugin: adds a menu item + listens to download events',
    type: 'ui',
    permissions: [{ type: 'ui', inject: ['menu'] }],
  },
] as const;

/** 插件 ID 约束：字母/数字开头，仅字母数字._-，防路径穿越 */
const PluginIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, '插件 ID 只允许字母、数字与 . _ -');

const InstallRequestSchema = z.object({
  id: PluginIdSchema,
  version: z.string().min(1).max(32).optional(),
});

const IdParamSchema = z.object({ id: PluginIdSchema });

function envelope(res: Response, data: unknown, status = 200): void {
  res.status(status).json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
}

/** 读插件 manifest；不存在/损坏统一 404（损坏不应把内部错误细节泄给客户端） */
async function readPluginManifest(pluginsDir: string, id: string): Promise<Record<string, unknown>> {
  try {
    const manifest = JSON.parse(
      await fs.readFile(path.join(pluginsDir, id, 'manifest.json'), 'utf-8'),
    ) as Record<string, unknown>;
    if (manifest.id !== id) throw new Error('manifest.id 与目录名不一致');
    return manifest;
  } catch {
    throw new AppError('NOT_FOUND', 404, `插件 ${id} 不存在或 manifest 无效`);
  }
}

export function createPluginsRouter(
  pluginsDir: string = resolvePluginsDir(),
  installedJsonPath: string = path.join(pluginsDir, 'installed.json'),
): Router {
  const router = Router();

  // 全部市场端点要求主站认证
  router.use(auth);

  // GET /api/plugins/registry — 官方注册表（静态，无 IO；同步 throw 仍进 errorHandler）
  router.get('/registry', (_req, res) => {
    envelope(res, { plugins: OFFICIAL_REGISTRY });
  });

  // GET /api/plugins/registry/:id — 单个插件详情（本地 manifest）
  router.get(
    '/registry/:id',
    validate(IdParamSchema, 'params'),
    asyncHandler(async (req, res) => {
      const { id } = req.params as { id: string };
      envelope(res, await readPluginManifest(pluginsDir, id));
    }),
  );

  // GET /api/plugins/installed — 已安装状态（installed.json 原样）
  router.get(
    '/installed',
    asyncHandler(async (_req, res) => {
      const raw = await fs.readFile(installedJsonPath, 'utf-8').catch(() => '{}');
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        data = {};
      }
      envelope(res, data);
    }),
  );

  // POST /api/plugins/install — 校验本地插件并返回 manifest 供用户授权（不写状态，授权流程 v3.2.0）
  router.post(
    '/install',
    validate(InstallRequestSchema),
    asyncHandler(async (req, res) => {
      const { id, version } = req.body as { id: string; version?: string };
      const manifest = await readPluginManifest(pluginsDir, id);
      if (version && manifest.version !== version) {
        throw new AppError('VERSION_MISMATCH', 400, `插件版本不匹配：请求 ${version}，实际 ${String(manifest.version)}`);
      }
      envelope(res, { manifest });
    }),
  );

  // POST /api/plugins/:id/enable — v3.1.0 市场骨架，启用走 installed.json（响应码 501 已在 openapi 文档化）
  router.post('/:id/enable', validate(IdParamSchema, 'params'), () => {
    throw new AppError(
      'NOT_IMPLEMENTED',
      501,
      'v3.1.0 市场骨架：请直接编辑 installed.json，启用流程随 v3.2.0 市场前端落地',
    );
  });

  return router;
}

export default createPluginsRouter();
