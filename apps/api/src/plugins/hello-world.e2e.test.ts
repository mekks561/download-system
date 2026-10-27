import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PluginHost } from './PluginHost.js';
import { resolvePluginsDir } from './paths.js';

/**
 * hello-world 端到端验收（S4 Task 13）：
 * PluginHost 装载 hello-world → activate 成功 → 菜单注册（权限门禁通过）→
 * 点击菜单（invoke 进 worker，通知回传宿主）→ broadcast('download:complete')
 * → worker 收到并 logger.info 回传 → shutdown 干净。
 *
 * 插件目录使用仓库真实 hello-world（只读）；installedJsonPath 指向临时文件，
 * 不改写仓库状态文件 plugins/installed.json。
 */
async function waitFor(cond: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor 超时');
    await new Promise((r) => setTimeout(r, 20));
  }
}

interface LogSpy {
  mock: { calls: unknown[][] };
  mockRestore: () => void;
}

function joined(spy: LogSpy): string {
  return spy.mock.calls.map((args) => args.map(String).join(' ')).join('\n');
}

describe('hello-world 插件端到端装载与广播（Task 13 验收）', () => {
  let host: PluginHost;
  let installedJsonPath: string;
  let logSpy: LogSpy | undefined;

  afterEach(async () => {
    logSpy?.mockRestore();
    if (host) await host.shutdown();
    if (installedJsonPath) await fs.rm(path.dirname(installedJsonPath), { recursive: true, force: true });
  });

  it('装载 → 激活 → 菜单点击 → 事件广播 → 关闭 全链路', async () => {
    // installed.json 写到临时目录（内容引用仓库根 plugins/hello-world）
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dm-plugins-e2e-'));
    installedJsonPath = path.join(tmpDir, 'installed.json');
    await fs.writeFile(
      installedJsonPath,
      JSON.stringify({
        'hello-world': {
          version: '1.0.0',
          path: 'hello-world/',
          enabled: true,
          approvedAt: new Date().toISOString(),
          state: 'installed',
          lastError: null,
        },
      }),
      'utf-8',
    );

    logSpy = vi.spyOn(console, 'log');
    host = new PluginHost({ pluginsDir: resolvePluginsDir(), installedJsonPath });

    // 1) 装载 + 激活
    await host.loadAll();
    expect(host.listInstalled()).toEqual([
      { id: 'hello-world', version: '1.0.0', state: 'activated' },
    ]);
    expect(joined(logSpy)).toContain('Hello World plugin activated');

    // 2) 菜单注册成功（manifest 有 ui.inject.menu 权限）
    const menus = host.listMenus();
    expect(menus.map((m) => m.label)).toEqual(['Say Hello']);

    // 3) 点击菜单 → invoke 进 worker → showNotification 回传宿主
    menus[0].onClick();
    await waitFor(() => joined(logSpy!).includes('notification: Hello from plugin!'));

    // 4) 广播下载完成事件 → worker 分发给 ctx.host.on 的 handler → 日志回传
    await host.broadcast('download:complete', { taskId: '1', filename: 'test.txt' });
    await waitFor(() => joined(logSpy!).includes('Download finished: test.txt'));

    // 5) shutdown 干净：deactivate 日志到达后 listInstalled 清空
    await host.shutdown();
    expect(host.listInstalled()).toEqual([]);
    expect(joined(logSpy)).toContain('Hello World deactivated');
  });
});
