import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import * as aiService from '../services/ai.service.js';
import {
  hasUiPermission,
  type MenuContribution,
  type PluginManifest,
  type Unsubscribe,
} from '@dm/plugin-sdk';
import type { GmPluginResponse } from '@dm/shared';
import { SandboxRunner } from './SandboxRunner.js';
import { workerManager } from '../services/worker-manager.service.js';
import { AppError } from '../utils/errors.js';
import * as downloadService from '../services/download.service.js';
import axios from 'axios';

/** installed.json 单条记录（Schema 见 docs/plugins/04-lifecycle.md「Persistence」） */
export interface InstalledEntry {
  version: string;
  path: string;
  enabled: boolean;
  approvedAt: string;
  state: 'installed' | 'activated' | 'deactivated' | 'error' | 'uninstalled';
  lastError: string | null;
  securityAudit?: aiService.SecurityAuditResult;
}

export interface PluginHostOptions {
  /** 插件根目录（每个插件一个子目录，内含 manifest.json + 入口文件） */
  pluginsDir: string;
  /** 安装状态文件路径（默认 <pluginsDir>/installed.json；测试必须指向临时目录，禁止改写仓库真实状态文件） */
  installedJsonPath: string;
}

export interface InstalledPluginSummary {
  id: string;
  version: string;
  state: InstalledEntry['state'];
}

interface LoadedPlugin {
  entry: InstalledEntry;
  runner: SandboxRunner;
  manifest: PluginManifest;
  unsubscribeError: Unsubscribe;
}

interface MenuRecord {
  pluginId: string;
  menu: MenuContribution;
}

/**
 * 插件宿主（S4 Task 10）：装载 installed.json、fork SandboxRunner、
 * 管理 activate/broadcast/uninstall/shutdown 生命周期，并对插件的 UI 注册
 * 做 manifest 权限门禁（hasUiPermission）。
 *
 * 设计要点：
 * - host-call 消息处理处做权限检查（plan 原稿在构造 ctx 时检查；ctx 改为 worker
 *   内代理后，检查移到消息还原处，语义不变）。
 * - persistInstalled 全量写回 entries（含 disabled/error 条目），修掉 plan 原稿
 *   「只回写已加载条目导致禁用插件被抹掉」的缺陷。
 * - 事件广播不等待 worker 处理结果（postMessage 即返回），与 docs/plugins/04 的
 *   「并发广播、不串行化」一致。
 */
export class PluginHost {
  private entries: Record<string, InstalledEntry> = {};
  private entriesLoaded = false;
  private readonly loaded = new Map<string, LoadedPlugin>();
  private menus: MenuRecord[] = [];

  constructor(private readonly options: PluginHostOptions) {}

  /**
   * 扫描 installed.json 并激活所有 enabled 的插件。
   * 单个插件失败只标记 error 状态，不影响其它插件，也不向上抛。
   */
  async loadAll(): Promise<void> {
    await this.ensureEntries();

    for (const [id, entry] of Object.entries(this.entries)) {
      if (!entry.enabled) continue;
      // error 状态不自动重启（docs/plugins/04：需用户介入）
      if (entry.state === 'error') continue;
      // 幂等：重复 loadAll 跳过已激活插件，避免对同 id 重复 fork runner（旧 runner 泄漏）
      // 与重复注册 menus
      if (this.loaded.has(id)) continue;
      try {
        await this.loadPlugin(id, entry);
      } catch (err) {
        entry.state = 'error';
        entry.lastError = err instanceof Error ? err.message : String(err);
        console.error(`[PluginHost] 插件 ${id} 加载失败:`, err);
      }
    }
    await this.persistInstalled();
  }

  /** 已成功激活的插件列表 */
  listInstalled(): InstalledPluginSummary[] {
    return Array.from(this.loaded.entries()).map(([id, { entry }]) => ({
      id,
      version: entry.version,
      state: entry.state,
    }));
  }

  /** 通过权限门禁注册的菜单贡献（onClick 已重建为宿主 invoke 回调） */
  listMenus(): MenuContribution[] {
    return this.menus.map((m) => m.menu);
  }

  /** 列出所有已安装的插件（含未激活/禁用的），包含元数据 */
  async listAll(): Promise<GmPluginResponse[]> {
    await this.ensureEntries();
    const results: GmPluginResponse[] = [];

    for (const [id, entry] of Object.entries(this.entries)) {
      const loaded = this.loaded.get(id);
      let manifest: PluginManifest | null = loaded?.manifest || null;

      if (!manifest) {
        try {
          const dir = this.resolvePluginDir(entry.path);
          const manifestPath = path.join(dir, 'manifest.json');
          manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as PluginManifest;
        } catch {
          // 忽略 manifest 读取失败，仅使用 entry 信息
        }
      }

      results.push({
        id,
        version: entry.version,
        name: manifest?.name,
        description: manifest?.description,
        state: entry.state,
        enabled: entry.enabled,
        lastError: entry.lastError,
        permissions: manifest?.permissions?.map(p => typeof p === 'string' ? p : p.type),
        securityAudit: entry.securityAudit,
      });
    }

    return results;
  }

  /** 启用/禁用插件 */
  async toggle(id: string, enabled: boolean): Promise<void> {
    await this.ensureEntries();
    const entry = this.entries[id];
    if (!entry) throw new Error(`插件 ${id} 不存在`);

    if (entry.enabled === enabled) return;

    entry.enabled = enabled;
    if (enabled) {
      // 启用：尝试加载
      try {
        await this.loadPlugin(id, entry);
        // 工业化同步：插件启用后，同步到 Worker
        void this.syncPluginsToAllWorkers();
      } catch (err) {
        entry.state = 'error';
        entry.lastError = err instanceof Error ? err.message : String(err);
      }
    } else {
      // 禁用：卸载运行时，状态置为 deactivated
      await this.unload(id);
      entry.state = 'deactivated';
      // 工业化同步：告知 Worker 卸载插件
      void this.broadcastSyncToAllWorkers(id, 'uninstall');
    }

    await this.persistInstalled();
  }

  /** 向所有已激活插件广播事件 */
  async broadcast(event: string, payload: unknown): Promise<void> {
    for (const { runner } of this.loaded.values()) {
      await runner.broadcast(event, payload);
    }
  }

  /** 卸载：deactivate + 关闭 worker + 删除插件目录 + 移除 installed.json 条目 */
  async uninstall(id: string): Promise<void> {
    await this.ensureEntries();
    await this.unload(id);
    delete this.entries[id];
    const dir = this.resolvePluginDir(id);
    await fs.rm(dir, { recursive: true, force: true });
    await this.persistInstalled();
    // 告知 Worker 卸载
    void this.broadcastSyncToAllWorkers(id, 'uninstall');
  }

  /**
   * 工业化同步：将所有启用插件推送到所有 Worker
   */
  async syncPluginsToAllWorkers(): Promise<void> {
    const workers = workerManager.getAvailableWorkers();
    for (const w of workers) {
      void this.syncPluginsToWorker(w.workerId);
    }
  }

  async syncPluginsToWorker(workerId: string): Promise<void> {
    await this.ensureEntries();
    const activePlugins = Object.entries(this.entries)
      .filter(([, entry]) => entry.enabled && entry.state === 'activated');
    
    for (const [id, entry] of activePlugins) {
      try {
        const pluginDir = this.resolvePluginDir(entry.path);
        const zip = new AdmZip();
        zip.addLocalFolder(pluginDir);
        const buffer = zip.toBuffer();

        const worker = workerManager.getWorker(workerId);
        if (!worker) continue;

        const internalUrl = `http://${worker.ip}:${worker.port}/internal/sync-plugin`;
        await axios.post(internalUrl, buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Internal-Secret': process.env.INTERNAL_SECRET || 'default-secret',
            'X-Plugin-Id': id
          }
        });
        console.log(`[PluginHost] 插件 ${id} 已同步到 Worker ${workerId}`);
      } catch (err: any) {
        console.warn(`[PluginHost] 插件 ${id} 同步到 Worker ${workerId} 失败: ${err.message}`);
      }
    }
  }

  private async broadcastSyncToAllWorkers(pluginId: string, action: 'uninstall'): Promise<void> {
    const workers = workerManager.getAvailableWorkers();
    for (const w of workers) {
      try {
        const internalUrl = `http://${w.ip}:${w.port}/internal/sync-plugin`;
        await axios.delete(internalUrl, {
          headers: {
            'X-Internal-Secret': process.env.INTERNAL_SECRET || 'default-secret',
            'X-Plugin-Id': pluginId
          }
        });
      } catch (err: any) {
        console.warn(`[PluginHost] 插件 ${pluginId} 指令 ${action} 同步失败: ${err.message}`);
      }
    }
  }

  /**
   * 安装插件：解压 zip 到 plugins 目录并写入 installed.json。
   */
  async install(zipPath: string): Promise<string> {
    await this.ensureEntries();
    
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipPath);
    } catch (err) {
      throw new Error('无效的 ZIP 文件');
    }

    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      throw new Error('插件包中缺少 manifest.json');
    }

    const manifest = JSON.parse(manifestEntry.getData().toString('utf8')) as PluginManifest;
    if (!manifest.id || !manifest.version) {
      throw new AppError('BAD_REQUEST', 400, 'manifest.json 格式错误（缺少 id 或 version）');
    }

    // 工业化校验：确保入口文件存在
    const entryFile = manifest.entry || 'index.js';
    const hasEntry = zip.getEntries().some(e => e.entryName === entryFile);
    if (!hasEntry) {
      throw new AppError('BAD_REQUEST', 400, `插件包中缺少入口文件: ${entryFile}`);
    }

    // 工业化安全审计：利用 AI 扫描代码风险
    console.log(`[PluginHost] 正在对插件 ${manifest.id} 进行 AI 安全审计...`);
    const codeFiles = zip.getEntries()
      .filter(e => !e.isDirectory && (e.entryName.endsWith('.js') || e.entryName.endsWith('.json')))
      .slice(0, 10) // 工业化 2.0 优化: 仅审计前 10 个核心代码文件，防止 Token 超限
      .map(e => ({
        name: e.entryName,
        content: e.getData().toString('utf8').substring(0, 5000) // 每个文件仅取前 5KB
      }));
    
    let auditResult: aiService.SecurityAuditResult | null = null;
    try {
      auditResult = await aiService.auditPluginCode(codeFiles);
    } catch (err) {
      console.warn(`[PluginHost] 插件 ${manifest.id} AI 安全审计服务调用失败，将以低风险模式安装:`, err);
    }

    if (auditResult && auditResult.riskLevel === 'high') {
      console.warn(`[PluginHost] 插件 ${manifest.id} 安全审计未通过 (Risk: ${auditResult.riskLevel}, Score: ${auditResult.score})`);
      throw new AppError('SECURITY_RISK', 403, `AI 安全审计拦截：该插件风险等级极高 (${auditResult.summary})`);
    }

    const pluginDir = this.resolvePluginDir(manifest.id);
    await fs.mkdir(pluginDir, { recursive: true });
    
    zip.extractAllTo(pluginDir, true);

    const entry: InstalledEntry = {
      version: manifest.version,
      path: manifest.id,
      enabled: true, // 默认安装后启用
      approvedAt: new Date().toISOString(),
      state: 'installed',
      lastError: null,
      securityAudit: auditResult || undefined,
    };

    this.entries[manifest.id] = entry;
    await this.persistInstalled();
    
    // 工业化同步：新安装插件后，异步推送到所有在线 Worker
    void this.syncPluginsToAllWorkers();
    
    // 尝试即时加载
    try {
      await this.loadPlugin(manifest.id, entry);
    } catch (err) {
      console.error(`[PluginHost] 新安装插件 ${manifest.id} 自动加载失败:`, err);
    }

    return manifest.id;
  }

  /** 关闭所有插件（宿主进程退出前调用；不落盘，保持 installed.json 状态不变） */
  async shutdown(): Promise<void> {
    for (const [, plugin] of this.loaded) {
      plugin.unsubscribeError();
      try {
        await plugin.runner.deactivate();
      } catch (err) {
        console.warn(`[PluginHost] 插件 ${plugin.manifest.id} deactivate 异常（关闭阶段忽略）:`, err);
      }
      await plugin.runner.terminate();
    }
    this.loaded.clear();
    this.menus = [];
  }

  private async loadPlugin(id: string, entry: InstalledEntry): Promise<void> {
    const pluginDir = this.resolvePluginDir(entry.path);
    const manifestPath = path.join(pluginDir, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as PluginManifest;
    const pluginPath = path.join(pluginDir, manifest.entry || 'index.js');

    const runner = new SandboxRunner(
      pluginPath, 
      manifest, 
      (method, args) => this.handleHostCall(id, manifest, runner, method, args, entry.securityAudit),
      entry.securityAudit
    );
    const unsubscribeError = runner.onError((err) => {
      // markError 内含 persistInstalled 写盘；失败时兜底告警，避免 unhandled rejection
      this.markError(id, err).catch((persistErr) => {
        console.warn(`[PluginHost] 插件 ${id} 异常状态落盘失败:`, persistErr);
      });
    });
    await runner.activate();

    this.loaded.set(id, { entry, runner, manifest, unsubscribeError });
    entry.state = 'activated';
    entry.lastError = null;
    console.log(`[PluginHost] 插件 ${id}@${entry.version} 已激活`);
  }

  /**
   * worker host-call 分发：把插件侧代理的宿主调用还原为真实调用。
   * UI 注册在此处做 manifest 权限门禁（无对应 ui.inject.* 权限时拒绝且不报错）。
   */
  private handleHostCall(
    pluginId: string,
    manifest: PluginManifest,
    runner: SandboxRunner,
    method: string,
    args: unknown[],
    audit?: aiService.SecurityAuditResult,
  ): void {
    // 工业化安全沙箱策略：基于 AI 审计结果动态降级权限
    if (audit && audit.riskLevel !== 'low') {
      const sensitiveMethods = ['executeRemoteTask', 'updateTaskMetadata'];
      if (sensitiveMethods.includes(method)) {
        console.warn(`[PluginHost] 拦截 ${pluginId} 的敏感调用 ${method} (原因: AI 审计风险等级为 ${audit.riskLevel})`);
        return;
      }
    }

    switch (method) {
      case 'logger.info':
      case 'logger.warn':
      case 'logger.error': {
        const line = `[${pluginId}] ${String(args[0])}`;
        if (method === 'logger.info') console.log(line);
        else if (method === 'logger.warn') console.warn(line);
        else console.error(line);
        return;
      }
      case 'showNotification': {
        console.log(`[${pluginId}] notification: ${String(args[0])}`);
        return;
      }
      case 'emit': {
        const [event, payload] = args as [string, unknown?];
        if (typeof event !== 'string' || event.length === 0) return;
        void this.broadcast(event, payload);
        return;
      }
      case 'registerMenu': {
        const menu = args[0] as Partial<MenuContribution> | undefined;
        if (!menu || typeof menu.id !== 'string' || typeof menu.label !== 'string') {
          console.warn(`[PluginHost] ${pluginId} registerMenu 参数无效，已忽略`);
          return;
        }
        if (!hasUiPermission(manifest.permissions, 'menu')) {
          console.warn(`[PluginHost] ${pluginId} 菜单注册被拒绝（manifest 缺少 ui.inject.menu 权限）`);
          return;
        }
        const menuId = menu.id;
        this.menus.push({
          pluginId,
          // onClick 无法跨线程传递：宿主按 id 重建为 invoke 消息，插件逻辑仍在 worker 执行
          menu: { ...menu, id: menuId, label: menu.label, onClick: () => runner.invokeMenuClick(menuId) },
        });
        console.log(`[PluginHost] ${pluginId} 注册菜单: ${menu.label}`);
        return;
      }
      case 'registerPage':
      case 'registerWidget': {
        const scope = method === 'registerPage' ? 'page' : 'widget';
        const contribution = args[0] as { id?: unknown; label?: unknown } | undefined;
        const label = typeof contribution?.label === 'string' ? contribution.label : method;
        if (!hasUiPermission(manifest.permissions, scope)) {
          console.warn(`[PluginHost] ${pluginId} ${scope} 注册被拒绝（manifest 缺少 ui.inject.${scope} 权限）`);
          return;
        }
        // MVP：页面/小组件的 React 组件注入由渲染进程接管（v3.2.0 市场前端），宿主仅记录贡献元数据
        console.log(`[PluginHost] ${pluginId} 注册 ${scope}（元数据）: ${label}`);
        return;
      }
      case 'executeRemoteTask': {
        const [workerId, taskType, taskArgs, callbackId] = args as [string, string, unknown, string];
        this.handleRemoteTask(workerId, taskType, taskArgs)
          .then(result => runner.sendResponse(callbackId, { success: true, data: result }))
          .catch(err => runner.sendResponse(callbackId, { success: false, error: err.message }));
        return;
      }
      case 'updateTaskMetadata': {
        const [taskId, metadata, callbackId] = args as [string, Record<string, any>, string];
        downloadService.updateDownloadMetadataInternal(parseInt(taskId), metadata)
          .then(() => runner.sendResponse(callbackId, { success: true }))
          .catch(err => runner.sendResponse(callbackId, { success: false, error: err.message }));
        return;
      }
      case 'classifyFile': {
        const [filename, url, context, callbackId] = args as [string, string | undefined, any, string];
        aiService.classifyFile(filename, url, context)
          .then(result => runner.sendResponse(callbackId, { success: true, data: result }))
          .catch(err => runner.sendResponse(callbackId, { success: false, error: err.message }));
        return;
      }
      default:
        console.warn(`[PluginHost] ${pluginId} 未知的 host 调用: ${method}`);
    }
  }

  private async handleRemoteTask(workerId: string, taskType: string, args: unknown): Promise<unknown> {
    const worker = workerManager.getWorker(workerId);
    if (!worker) throw new Error(`Worker ${workerId} 不在线`);

    const internalUrl = `http://${worker.ip}:${worker.port}/internal/plugin-hook`;
    const response = await axios.post(internalUrl, {
      taskType,
      args
    }, {
      headers: {
        'X-Internal-Secret': process.env.INTERNAL_SECRET || 'default-secret'
      }
    });

    return response.data;
  }

  private async markError(id: string, err: Error): Promise<void> {
    console.error(`[PluginHost] 插件 ${id} worker 异常:`, err);
    const plugin = this.loaded.get(id);
    if (!plugin) return;
    plugin.unsubscribeError();
    plugin.entry.state = 'error';
    plugin.entry.lastError = err.message;
    this.loaded.delete(id);
    this.menus = this.menus.filter((m) => m.pluginId !== id);
    await this.persistInstalled();
  }

  private async unload(id: string): Promise<void> {
    const plugin = this.loaded.get(id);
    if (!plugin) return;
    plugin.unsubscribeError();
    try {
      await plugin.runner.deactivate();
    } catch (err) {
      console.warn(`[PluginHost] 插件 ${id} deactivate 异常（继续卸载）:`, err);
    }
    await plugin.runner.terminate();
    this.loaded.delete(id);
    this.menus = this.menus.filter((m) => m.pluginId !== id);
  }

  /** 插件目录解析 + 越界防护（installed.json 内容被篡改时不至于删到插件根之外） */
  private resolvePluginDir(idOrPath: string): string {
    const root = path.resolve(this.options.pluginsDir);
    const resolved = path.resolve(root, idOrPath);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error(`插件路径越界: ${idOrPath}`);
    }
    return resolved;
  }

  private async ensureEntries(): Promise<void> {
    if (this.entriesLoaded) return;
    const raw = await fs.readFile(this.options.installedJsonPath, 'utf-8').catch(() => '{}');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    this.entries =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, InstalledEntry>)
        : {};
    this.entriesLoaded = true;
  }

  /** 全量写回 entries（保留 disabled/error 条目） */
  private async persistInstalled(): Promise<void> {
    await fs.writeFile(
      this.options.installedJsonPath,
      JSON.stringify(this.entries, null, 2),
      'utf-8',
    );
  }
}
