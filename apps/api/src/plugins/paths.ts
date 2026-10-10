import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * 解析本地插件根目录（S4 MVP）。
 *
 * 优先级：
 * 1. 环境变量 PLUGINS_DIR（显式指定，如 Electron userData/plugins）；
 * 2. cwd 下的 plugins/（以仓库根为 cwd 运行时）；
 * 3. cwd 上两级的 plugins/（`pnpm --filter api dev` 时 cwd=apps/api）。
 *
 * 两个候选都不存在时回退到 cwd/plugins（读取方对缺失文件均已容错：
 * installed.json 缺失视为空注册表，manifest 缺失返回 404）。
 */
export function resolvePluginsDir(): string {
  const env = process.env.PLUGINS_DIR;
  if (env) return path.resolve(env);

  const candidates = [
    path.resolve(process.cwd(), 'plugins'),
    path.resolve(process.cwd(), '..', '..', 'plugins'),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}
