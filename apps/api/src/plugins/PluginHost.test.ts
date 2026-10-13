import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PluginHost } from './PluginHost';
import { resolvePluginsDir } from './paths';

/**
 * PluginHost 生命周期与权限门禁测试（S4 Task 10）。
 *
 * 隔离原则：installed.json 与插件目录一律写入 os.tmpdir() 随机目录并在
 * afterEach 清理，绝不改写仓库真实状态文件 plugins/installed.json。
 * hello-world 入口/manifest 从仓库只读拷贝进临时目录。
 */
const repoPluginsDir = resolvePluginsDir();
const helloWorldDir = path.join(repoPluginsDir, 'hello-world');

async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor 超时');
    await new Promise((r) => setTimeout(r, 20));
  }
}

interface FixtureOptions {
  permissions?: unknown[];
  installedEntries?: Record<string, unknown>;
}

/** 创建临时插件目录 fixture，返回 { pluginsDir, installedJsonPath } */
async function setupFixture(options: FixtureOptions = {}) {
  const pluginsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dm-plugins-test-'));
  const pluginDir = path.join(pluginsDir, 'hello-world');
  await fs.mkdir(pluginDir, { recursive: true });
  await fs.copyFile(path.join(helloWorldDir, 'index.js'), path.join(pluginDir, 'index.js'));

  const manifest = JSON.parse(await fs.readFile(path.join(helloWorldDir, 'manifest.json'), 'utf-8')) as Record<
    string,
    unknown
  >;
  if (options.permissions) manifest.permissions = options.permissions;
  await fs.writeFile(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  const installedJsonPath = path.join(pluginsDir, 'installed.json');
  await fs.writeFile(
    installedJsonPath,
    JSON.stringify(
      options.installedEntries ?? {
        'hello-world': {
          version: '1.0.0',
          path: 'hello-world/',
          enabled: true,
          approvedAt: new Date().toISOString(),
          state: 'installed',
          lastError: null,
        },
      },
      null,
      2,
    ),
    'utf-8',
  );
  return { pluginsDir, installedJsonPath };
}

interface LogSpy {
  mock: { calls: unknown[][] };
  mockRestore: () => void;
}

function collectLogs(spy: LogSpy): string {
  return spy.mock.calls.map((args) => args.map(String).join(' ')).join('\n');
}

describe('PluginHost', () => {
  let host: PluginHost;
  let fixtureDir: string;
  let logSpy: LogSpy | undefined;
  let warnSpy: LogSpy | undefined;

  afterEach(async () => {
    logSpy?.mockRestore();
    warnSpy?.mockRestore();
    if (host) await host.shutdown();
    if (fixtureDir) await fs.rm(fixtureDir, { recursive: true, force: true });
  });

  it('loads hello-world plugin from installed.json and gates menu registration', async () => {
    const fx = await setupFixture();
    fixtureDir = fx.pluginsDir;
    logSpy = vi.spyOn(console, 'log');
    host = new PluginHost({ pluginsDir: fx.pluginsDir, installedJsonPath: fx.installedJsonPath });

    await host.loadAll();

    const installed = host.listInstalled();
    expect(installed).toHaveLength(1);
    expect(installed[0].id).toBe('hello-world');
    expect(installed[0].state).toBe('activated');

    const menus = host.listMenus();
    expect(menus).toHaveLength(1);
    expect(menus[0].id).toBe('hello-world.greet');
    expect(menus[0].label).toBe('Say Hello');
    // 点击回调由宿主重建（worker 内执行），不是插件侧函数直传
    expect(typeof menus[0].onClick).toBe('function');
    expect(collectLogs(logSpy)).toContain('注册菜单: Say Hello');
  });

  it('broadcasts events to all active plugins', async () => {
    const fx = await setupFixture();
    fixtureDir = fx.pluginsDir;
    logSpy = vi.spyOn(console, 'log');
    host = new PluginHost({ pluginsDir: fx.pluginsDir, installedJsonPath: fx.installedJsonPath });
    await host.loadAll();

    await host.broadcast('download:complete', { taskId: '1', filename: 'test.txt' });
    await waitFor(() => collectLogs(logSpy!).includes('Download finished: test.txt'));
  });

  it('denies menu registration when ui.inject.menu permission is missing', async () => {
    const fx = await setupFixture({ permissions: [] });
    fixtureDir = fx.pluginsDir;
    warnSpy = vi.spyOn(console, 'warn');
    host = new PluginHost({ pluginsDir: fx.pluginsDir, installedJsonPath: fx.installedJsonPath });

    await host.loadAll();

    // 插件本身激活成功（无报错），但菜单注册被权限门禁拒绝
    expect(host.listInstalled()).toHaveLength(1);
    expect(host.listMenus()).toHaveLength(0);
    expect(collectLogs(warnSpy!)).toContain('菜单注册被拒绝');
  });

  it('unloads plugin on uninstall and removes its directory', async () => {
    const fx = await setupFixture();
    fixtureDir = fx.pluginsDir;
    host = new PluginHost({ pluginsDir: fx.pluginsDir, installedJsonPath: fx.installedJsonPath });
    await host.loadAll();

    await host.uninstall('hello-world');

    expect(host.listInstalled()).toHaveLength(0);
    expect(host.listMenus()).toHaveLength(0);
    await expect(fs.access(path.join(fx.pluginsDir, 'hello-world'))).rejects.toThrow();
    const persisted = JSON.parse(await fs.readFile(fx.installedJsonPath, 'utf-8')) as Record<string, unknown>;
    expect(persisted['hello-world']).toBeUndefined();
  });

  it('keeps disabled entries when persisting installed.json', async () => {
    const fx = await setupFixture({
      installedEntries: {
        'hello-world': {
          version: '1.0.0',
          path: 'hello-world/',
          enabled: true,
          approvedAt: new Date().toISOString(),
          state: 'installed',
          lastError: null,
        },
        'disabled-plugin': {
          version: '0.9.0',
          path: 'disabled-plugin/',
          enabled: false,
          approvedAt: new Date().toISOString(),
          state: 'deactivated',
          lastError: null,
        },
      },
    });
    fixtureDir = fx.pluginsDir;
    host = new PluginHost({ pluginsDir: fx.pluginsDir, installedJsonPath: fx.installedJsonPath });

    await host.loadAll();

    // 只有 enabled 插件被装载；persist 全量写回不得抹掉 disabled 条目
    expect(host.listInstalled().map((p) => p.id)).toEqual(['hello-world']);
    const persisted = JSON.parse(await fs.readFile(fx.installedJsonPath, 'utf-8')) as Record<
      string,
      { enabled: boolean }
    >;
    expect(persisted['disabled-plugin'].enabled).toBe(false);
    expect(persisted['hello-world'].enabled).toBe(true);
  });

  it('is idempotent: repeated loadAll does not duplicate runners or menus', async () => {
    const fx = await setupFixture();
    fixtureDir = fx.pluginsDir;
    logSpy = vi.spyOn(console, 'log');
    host = new PluginHost({ pluginsDir: fx.pluginsDir, installedJsonPath: fx.installedJsonPath });

    await host.loadAll();
    await host.loadAll();

    // 二次 loadAll 不得对同 id 再 fork 新 runner（旧 runner 泄漏）或重复注册菜单
    const installed = host.listInstalled();
    expect(installed).toHaveLength(1);
    expect(installed.filter((p) => p.id === 'hello-world')).toHaveLength(1);
    expect(host.listMenus()).toHaveLength(1);
    expect(host.listMenus().filter((m) => m.id === 'hello-world.greet')).toHaveLength(1);
  });

  it('listAll returns all installed plugins with metadata', async () => {
    const fx = await setupFixture({
      installedEntries: {
        'hello-world': {
          version: '1.0.0',
          path: 'hello-world/',
          enabled: true,
          approvedAt: new Date().toISOString(),
          state: 'installed',
          lastError: null,
        },
        'disabled-plugin': {
          version: '0.9.0',
          path: 'disabled-plugin/',
          enabled: false,
          approvedAt: new Date().toISOString(),
          state: 'deactivated',
          lastError: null,
        },
      },
    });
    fixtureDir = fx.pluginsDir;
    host = new PluginHost({ pluginsDir: fx.pluginsDir, installedJsonPath: fx.installedJsonPath });

    const all = await host.listAll();
    expect(all).toHaveLength(2);
    expect(all.find((p) => p.id === 'hello-world')?.name).toBe('Hello World');
    expect(all.find((p) => p.id === 'disabled-plugin')?.enabled).toBe(false);
  });

  it('toggle enables and disables plugins', async () => {
    const fx = await setupFixture();
    fixtureDir = fx.pluginsDir;
    host = new PluginHost({ pluginsDir: fx.pluginsDir, installedJsonPath: fx.installedJsonPath });

    // 禁用
    await host.toggle('hello-world', false);
    const allAfterDisable = await host.listAll();
    expect(allAfterDisable[0].enabled).toBe(false);
    expect(allAfterDisable[0].state).toBe('deactivated');

    // 启用
    await host.toggle('hello-world', true);
    const allAfterEnable = await host.listAll();
    expect(allAfterEnable[0].enabled).toBe(true);
    expect(allAfterEnable[0].state).toBe('activated');
  });
});
