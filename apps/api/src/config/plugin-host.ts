import path from 'node:path';
import { PluginHost } from '../plugins/PluginHost.js';
import { resolvePluginsDir } from '../plugins/paths.js';
import { workerManager } from '../services/worker-manager.service.js';

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
    
    // 监听 Worker 上线事件，自动同步插件
    workerManager.on('worker_online', (workerId: string) => {
      console.log(`[PluginHost] 检测到 Worker ${workerId} 上线，开始同步插件...`);
      void pluginHost.syncPluginsToWorker(workerId);
    });

    // 监听 Worker 恢复事件
    workerManager.on('worker_recovery', (workerId: string) => {
      console.log(`[PluginHost] 检测到 Worker ${workerId} 恢复请求，确保插件一致性...`);
      void pluginHost.syncPluginsToWorker(workerId);
    });
  } catch (err) {
    console.warn('[PluginHost] 插件装载失败（不影响 API 启动）:', err);
  }
}
