import { parentPort, workerData } from 'node:worker_threads';

/**
 * Hello World 插件（S4 MVP 参考实现）。
 *
 * 与 plan 原始设计的偏差（workerData 序列化修正）：
 * workerData 无法携带宿主侧的 HostAPI/注册器（函数不可结构化克隆），
 * 因此这里在 worker 内构建一份 ctx 代理：所有 host.* / register* 调用
 * 都转成 `{ type: 'host-call', method, args }` 消息回传宿主（SandboxRunner），
 * 由宿主还原为真实调用并做权限门禁。函数参数（onClick/component）在发送前剥离，
 * 宿主侧重建为 invoke 消息回调，插件逻辑始终在 worker 内执行。
 */

const { manifest } = workerData;

// ---- host-call 转发与事件分发 ----
const eventHandlers = new Map();
const menuClickHandlers = new Map();

function sendHostCall(method, args) {
  parentPort.postMessage({ type: 'host-call', method, args });
}

// 插件作者面向的 PluginContext（与 @dm/plugin-sdk 类型契约一致）
const ctx = {
  manifest,
  host: {
    logger: {
      info: (msg) => sendHostCall('logger.info', [String(msg)]),
      warn: (msg) => sendHostCall('logger.warn', [String(msg)]),
      error: (msg) => sendHostCall('logger.error', [String(msg)]),
    },
    showNotification: (message) => sendHostCall('showNotification', [String(message)]),
    emit: (event, payload) => sendHostCall('emit', [event, payload]),
    on: (event, handler) => {
      const set = eventHandlers.get(event) ?? new Set();
      set.add(handler);
      eventHandlers.set(event, set);
      return () => set.delete(handler);
    },
  },
  // 注册器：剥离函数参数后转发（onClick 记在本表，宿主以 invoke 消息触发）
  registerMenu: (menu) => {
    menuClickHandlers.set(menu.id, menu.onClick);
    sendHostCall('registerMenu', [{ id: menu.id, label: menu.label, icon: menu.icon, order: menu.order }]);
  },
  registerPage: (page) => {
    sendHostCall('registerPage', [{ id: page.id, path: page.path, label: page.label, order: page.order }]);
  },
  registerWidget: (widget) => {
    sendHostCall('registerWidget', [
      { id: widget.id, label: widget.label, location: widget.location, order: widget.order },
    ]);
  },
};

// ---- 插件实现（对齐 @dm/plugin-sdk 的 PluginLifecycle<'ui'>）----
const plugin = {
  async activate(ctx) {
    ctx.host.logger.info('Hello World plugin activated');

    ctx.registerMenu({
      id: 'hello-world.greet',
      label: 'Say Hello',
      onClick: () => ctx.host.showNotification('Hello from plugin!'),
    });

    ctx.host.on('download:complete', (payload) => {
      ctx.host.logger.info(`Download finished: ${payload?.filename ?? 'unknown'}`);
    });
  },
  async deactivate(ctx) {
    ctx.host.logger.info('Hello World deactivated');
  },
};

// ---- worker 消息循环（协议见 apps/api/src/plugins/SandboxRunner.ts）----
if (parentPort) {
  parentPort.on('message', async (msg) => {
    if (msg?.type === 'activate') {
      try {
        await plugin.activate(ctx);
        parentPort.postMessage('activated');
      } catch (err) {
        parentPort.postMessage({ error: err instanceof Error ? err.message : String(err) });
      }
    } else if (msg?.type === 'event') {
      const handlers = eventHandlers.get(msg.event);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(msg.payload);
          } catch (err) {
            parentPort.postMessage({ error: `事件 ${msg.event} handler 异常: ${err instanceof Error ? err.message : String(err)}` });
          }
        }
      }
    } else if (msg?.type === 'invoke' && msg.kind === 'menu-onclick') {
      const onClick = menuClickHandlers.get(msg.id);
      if (onClick) {
        try {
          onClick();
        } catch (err) {
          parentPort.postMessage({ error: `菜单 ${msg.id} onClick 异常: ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    } else if (msg?.type === 'deactivate') {
      try {
        await plugin.deactivate(ctx);
        parentPort.postMessage('deactivated');
      } catch (err) {
        parentPort.postMessage({ error: err instanceof Error ? err.message : String(err) });
      }
      process.exit(0);
    }
  });
}
