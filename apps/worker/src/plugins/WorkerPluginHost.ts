import fs from 'node:fs/promises';
import path from 'node:path';
import { SandboxRunner } from './SandboxRunner';
import type { PluginManifest, Unsubscribe } from '@dm/plugin-sdk';

export interface WorkerPluginHostOptions {
  pluginsDir: string;
}

interface LoadedPlugin {
  runner: SandboxRunner;
  manifest: PluginManifest;
  unsubscribeError: Unsubscribe;
}

export class WorkerPluginHost {
  private readonly loaded = new Map<string, LoadedPlugin>();
  private readonly pluginsDir: string;

  constructor(options: WorkerPluginHostOptions) {
    this.pluginsDir = path.resolve(options.pluginsDir);
  }

  async init() {
    // 启动时扫描本地插件目录并加载
    try {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      const dirs = await fs.readdir(this.pluginsDir);
      for (const dirName of dirs) {
        const dirPath = path.join(this.pluginsDir, dirName);
        const stats = await fs.stat(dirPath);
        if (stats.isDirectory()) {
          await this.loadPlugin(dirName);
        }
      }
    } catch (err) {
      console.error('[WorkerPluginHost] 初始化失败:', err);
    }
  }

  async loadPlugin(pluginId: string) {
    if (this.loaded.has(pluginId)) {
      await this.unloadPlugin(pluginId);
    }

    try {
      const pluginDir = path.join(this.pluginsDir, pluginId);
      const manifestPath = path.join(pluginDir, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as PluginManifest;
      const entryFile = manifest.entry || 'index.js';
      const pluginPath = path.join(pluginDir, entryFile);

      const runner = new SandboxRunner(pluginPath, manifest, (method, args) =>
        this.handleHostCall(pluginId, manifest, runner, method, args),
      );

      const unsubscribeError = runner.onError((err) => {
        console.error(`[WorkerPluginHost] 插件 ${pluginId} 运行异常:`, err);
        void this.unloadPlugin(pluginId);
      });

      await runner.activate();
      this.loaded.set(pluginId, { runner, manifest, unsubscribeError });
      console.log(`[WorkerPluginHost] 插件 ${pluginId} 已在 Worker 加载`);
    } catch (err) {
      console.error(`[WorkerPluginHost] 插件 ${pluginId} 加载失败:`, err);
    }
  }

  async invoke(pluginId: string, method: string, args: any[]) {
    const loaded = this.loaded.get(pluginId);
    if (!loaded) throw new Error(`插件 ${pluginId} 未加载`);
    loaded.runner.invokeCustom(method, args);
  }

  async broadcast(event: string, payload: any) {
    for (const { runner } of this.loaded.values()) {
      await runner.broadcast(event, payload);
    }
  }

  async unloadPlugin(pluginId: string) {
    const loaded = this.loaded.get(pluginId);
    if (!loaded) return;

    loaded.unsubscribeError();
    try {
      await loaded.runner.deactivate();
    } catch (err) {
      console.warn(`[WorkerPluginHost] 插件 ${pluginId} 停用异常:`, err);
    }
    await loaded.runner.terminate();
    this.loaded.delete(pluginId);
    console.log(`[WorkerPluginHost] 插件 ${pluginId} 已在 Worker 卸载`);
  }

  private handleHostCall(
    pluginId: string,
    manifest: PluginManifest,
    runner: SandboxRunner,
    method: string,
    args: unknown[],
  ): void {
    // Worker 侧插件的 Host 调用处理
    // 大部分逻辑应在 Master 侧处理，Worker 侧主要处理本地任务
    switch (method) {
      case 'logger.info':
      case 'logger.warn':
      case 'logger.error': {
        const line = `[WorkerPlugin][${pluginId}] ${String(args[0])}`;
        if (method === 'logger.info') console.log(line);
        else if (method === 'logger.warn') console.warn(line);
        else console.error(line);
        return;
      }
      default:
        console.warn(`[WorkerPluginHost] ${pluginId} 发起了未支持的 Worker 侧 Host 调用: ${method}`);
    }
  }

  async shutdown() {
    for (const pluginId of this.loaded.keys()) {
      await this.unloadPlugin(pluginId);
    }
  }
}
