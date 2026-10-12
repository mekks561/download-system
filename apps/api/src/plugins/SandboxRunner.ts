import { Worker } from 'node:worker_threads';
import type { PluginManifest, Unsubscribe } from '@dm/plugin-sdk';

/**
 * 宿主侧收到 worker「host 调用」时的分发回调。
 *
 * method 与 SDK PluginContext 上的方法一一对应：
 * 'logger.info' | 'logger.warn' | 'logger.error' | 'showNotification' | 'emit'
 * | 'registerMenu' | 'registerPage' | 'registerWidget'
 */
export type HostCallHandler = (method: string, args: unknown[]) => void;

/** 回执超时：插件 activate/deactivate 未在时限内回执视为失败（防 worker 挂死拖垮宿主） */
const ACK_TIMEOUT_MS = 10_000;

interface PendingAck {
  kind: 'activated' | 'deactivated';
  resolve: (activated: boolean) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * worker_threads 沙箱运行器（S4 Task 9）。
 *
 * 与 plan 原始设计的偏差（workerData 序列化修正）：
 * HostAPI/注册器是函数，无法经结构化克隆传入 worker（构造即抛 DataCloneError）。
 * 因此 workerData 只携带可序列化数据（manifest），插件侧用一份本地 ctx 代理把
 * host.* / register* 调用转成 `{ type: 'host-call', method, args }` 消息回传宿主，
 * 由宿主侧（PluginHost）还原为真实调用并做权限门禁。
 *
 * 线程间消息协议：
 * - host → worker：
 *   - `{ type: 'activate' }` / `{ type: 'deactivate' }`：生命周期指令
 *   - `{ type: 'event', event, payload }`：宿主事件广播（分发给 ctx.host.on 注册的 handler）
 *   - `{ type: 'invoke', kind: 'menu-onclick', id }`：触发注册回调（如菜单点击，插件逻辑仍在 worker 执行）
 * - worker → host：
 *   - `'activated'` / `'deactivated'`：生命周期回执（plan 原协议，保留）
 *   - `{ error: string }`：生命周期失败回执
 *   - `{ type: 'host-call', method, args }`：插件侧对宿主 API 的调用（函数参数不可跨线程，
 *     registerMenu 的 onClick 由宿主按 id 重建为 invoke 消息回调）
 */
export class SandboxRunner {
  private readonly worker: Worker;
  private pendingAck?: PendingAck;
  private readonly errorListeners = new Set<(err: Error) => void>();

  constructor(
    pluginPath: string,
    private readonly manifest: PluginManifest,
    private readonly onHostCall: HostCallHandler,
  ) {
    this.worker = new Worker(pluginPath, {
      // 只传可结构化克隆的数据；ctx 代理在插件入口内构建
      workerData: { manifest },
      eval: false,
    });

    this.worker.on('message', (msg: unknown) => this.handleMessage(msg));
    this.worker.on('error', (err) => {
      // worker 崩溃（如入口即 throw）时立即以根因 reject 生命周期等待，
      // 避免干等 ACK 超时且 lastError 被误记为「回执超时」丢失根因
      const pending = this.pendingAck;
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingAck = undefined;
        pending.reject(
          new Error(`插件 ${this.manifest.id} ${pending.kind} 失败: worker 异常: ${err.message}`),
        );
      }
      for (const listener of this.errorListeners) listener(err);
    });
  }

  /** 激活插件（等待 'activated' 回执或错误/超时） */
  async activate(): Promise<boolean> {
    return this.sendLifecycleCommand('activated');
  }

  /** 停用插件（等待 'deactivated' 回执；插件侧回执后自行退出） */
  async deactivate(): Promise<void> {
    await this.sendLifecycleCommand('deactivated');
  }

  /** 向 worker 广播宿主事件（分发给 ctx.host.on 注册的 handler；postMessage 异步投递，不等待处理结果） */
  broadcast(event: string, payload: unknown): Promise<void> {
    this.worker.postMessage({ type: 'event', event, payload });
    return Promise.resolve();
  }

  /** 触发插件注册的菜单点击回调（onClick 在 worker 内执行） */
  invokeMenuClick(menuId: string): void {
    this.worker.postMessage({ type: 'invoke', kind: 'menu-onclick', id: menuId });
  }

  /** 注册 worker 崩溃/异常监听，返回退订函数 */
  onError(listener: (err: Error) => void): Unsubscribe {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  async terminate(): Promise<void> {
    await this.worker.terminate();
  }

  private sendLifecycleCommand(kind: PendingAck['kind']): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAck = undefined;
        reject(new Error(`插件 ${this.manifest.id} ${kind} 回执超时`));
      }, ACK_TIMEOUT_MS);
      this.pendingAck = { kind, resolve, reject, timer };
      this.worker.postMessage({ type: kind === 'activated' ? 'activate' : 'deactivate' });
    });
  }

  private handleMessage(msg: unknown): void {
    if (msg === 'activated' || msg === 'deactivated') {
      const pending = this.pendingAck;
      if (pending && msg === pending.kind) {
        clearTimeout(pending.timer);
        this.pendingAck = undefined;
        pending.resolve(msg === 'activated');
      }
      return;
    }
    if (isLifecycleFailure(msg)) {
      const pending = this.pendingAck;
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingAck = undefined;
        pending.reject(new Error(`插件 ${this.manifest.id} ${pending.kind} 失败: ${msg.error}`));
      } else {
        // 无 pending 时收到错误回执（如事件分发抛错），按 worker 异常上抛
        for (const listener of this.errorListeners) listener(new Error(String(msg.error)));
      }
      return;
    }
    if (isHostCall(msg)) {
      this.onHostCall(msg.method, msg.args);
    }
  }
}

function isLifecycleFailure(msg: unknown): msg is { error: string } {
  return typeof msg === 'object' && msg !== null && 'error' in msg && typeof msg.error === 'string';
}

function isHostCall(msg: unknown): msg is { type: 'host-call'; method: string; args: unknown[] } {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as { type?: unknown; method?: unknown; args?: unknown };
  return m.type === 'host-call' && typeof m.method === 'string' && Array.isArray(m.args);
}
