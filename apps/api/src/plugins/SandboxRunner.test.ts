import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SandboxRunner } from './SandboxRunner';
import { resolvePluginsDir } from './paths';
import type { PluginManifest } from '@dm/plugin-sdk';

/**
 * SandboxRunner 单元测试（S4 Task 9）。
 *
 * 直接装载仓库内的 hello-world 参考插件（只读），验证 worker_threads 沙箱的
 * activate / host-call 转发 / 事件广播 / 菜单 invoke / terminate 全链路。
 */
const manifest: PluginManifest = {
  id: 'hello-world',
  name: 'Hello World',
  version: '1.0.0',
  author: 'dm-team',
  description: 'demo',
  type: 'ui',
  permissions: [{ type: 'ui', inject: ['menu'] }],
  entry: 'index.js',
};

const pluginPath = path.join(resolvePluginsDir(), 'hello-world', 'index.js');

interface HostCallRecord {
  method: string;
  args: unknown[];
}

async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor 超时');
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe('SandboxRunner', () => {
  let runner: SandboxRunner;
  const calls: HostCallRecord[] = [];

  afterEach(async () => {
    if (runner) {
      await runner.terminate();
      runner = undefined as unknown as SandboxRunner;
    }
    calls.length = 0;
  });

  function createRunner(): SandboxRunner {
    runner = new SandboxRunner(pluginPath, manifest, (method, args) => {
      calls.push({ method, args });
    });
    return runner;
  }

  it('forks a worker and receives activated message', async () => {
    const activated = await createRunner().activate();
    expect(activated).toBe(true);
  });

  it('forwards host-calls and delivers broadcast events to worker handlers', async () => {
    await createRunner().activate();
    await waitFor(() => calls.some((c) => c.method === 'registerMenu'));
    expect(calls.some((c) => c.method === 'logger.info' && String(c.args[0]).includes('activated'))).toBe(true);

    await runner.broadcast('download:complete', { taskId: '1', filename: 'test.txt' });
    await waitFor(() =>
      calls.some((c) => c.method === 'logger.info' && String(c.args[0]).includes('Download finished: test.txt')),
    );
  });

  it('rebuilds menu onClick as invoke message (plugin code runs in worker)', async () => {
    await createRunner().activate();
    await waitFor(() => calls.some((c) => c.method === 'registerMenu'));
    const menu = calls.find((c) => c.method === 'registerMenu')?.args[0] as { id: string };
    expect(menu.id).toBe('hello-world.greet');
    // worker 侧剥离了函数参数：宿主收到的注册数据不可含函数
    expect(typeof (menu as Record<string, unknown>).onClick).not.toBe('function');

    runner.invokeMenuClick(menu.id);
    await waitFor(() =>
      calls.some((c) => c.method === 'showNotification' && c.args[0] === 'Hello from plugin!'),
    );
  });

  it('terminates worker cleanly', async () => {
    await createRunner().activate();
    await runner.terminate();
  });

  it('rejects activate fast with root cause when worker crashes at entry', async () => {
    // 入口即 throw 的假插件：activate 必须立即以根因 reject，
    // 而不是等满 10s 回执超时（否则 lastError 被误记为「回执超时」）
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dm-crash-plugin-'));
    try {
      const crashEntry = path.join(tmpDir, 'crash.js');
      await fs.writeFile(crashEntry, "throw new Error('BOOM_ROOT_CAUSE');", 'utf-8');
      const crashManifest: PluginManifest = { ...manifest, id: 'crash-plugin', entry: 'crash.js' };
      const crashRunner = new SandboxRunner(crashEntry, crashManifest, () => {});

      const start = Date.now();
      await expect(crashRunner.activate()).rejects.toThrow(/BOOM_ROOT_CAUSE/);
      expect(Date.now() - start).toBeLessThan(2000);
      await crashRunner.terminate();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
