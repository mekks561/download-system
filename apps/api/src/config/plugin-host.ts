import path from 'node:path';
import { PluginHost } from '../plugins/PluginHost';
import { resolvePluginsDir } from '../plugins/paths';

const pluginsDir = resolvePluginsDir();

/**
 * 全局插件宿主单例。
 * 在 server.ts 中调用 initPluginHost 初始化并启动。
 */
export const pluginHost = new PluginHost({
  pluginsDir,
  installedJsonPath: path.join(pluginsDir, 'installed.json'),
});

export async function initPluginHost() {
  console.log('[PluginHost] 正在初始化插件系统...');
  try {
    await pluginHost.loadAll();
  } catch (err) {
    console.warn('[PluginHost] 插件装载失败（不影响 API 启动）:', err);
  }
}
