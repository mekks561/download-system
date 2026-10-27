import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { assertUsableDownloadDir, listDirectories, resolveDownloadRoot } from './storage.service.js';

/**
 * 目录浏览的**信任边界**测试：越界必须一律被拒。
 *
 * 只碰文件系统、不碰数据库，因此逐条真实创建临时目录树验证，而不是 mock fs——
 * 这条边界一旦漏了就是服务端任意目录遍历，只能真测。
 */

let root: string;
let outside: string;

/** 断言抛出的 AppError 的 code/status */
async function expectAppError(promise: Promise<unknown>, code: string, status: number) {
  await expect(promise).rejects.toMatchObject({ code, status });
}

beforeAll(async () => {
  // 临时根目录与「根目录之外」的目录成对创建，用于验证越界拦截
  const base = await mkdtemp(join(tmpdir(), 'dm-storage-'));
  root = join(base, 'downloads');
  outside = join(base, 'outside');

  await mkdir(join(root, 'movies'), { recursive: true });
  await mkdir(join(root, 'music'), { recursive: true });
  await mkdir(join(root, 'nested', 'deep'), { recursive: true });
  await mkdir(join(root, '中文目录'), { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(root, 'notes.txt'), 'not a directory');
  process.env.DM_DOWNLOAD_ROOT = root;
});

afterAll(async () => {
  delete process.env.DM_DOWNLOAD_ROOT;
  if (root) await rm(resolve(root, '..'), { recursive: true, force: true });
});

describe('storage.service · 根目录解析', () => {
  it('DM_DOWNLOAD_ROOT 未配置时回落到 <cwd>/downloads', () => {
    const saved = process.env.DM_DOWNLOAD_ROOT;
    delete process.env.DM_DOWNLOAD_ROOT;
    expect(resolveDownloadRoot()).toBe(resolve(process.cwd(), 'downloads'));
    process.env.DM_DOWNLOAD_ROOT = saved;
  });

  it('配置了相对路径时解析为绝对路径', () => {
    const saved = process.env.DM_DOWNLOAD_ROOT;
    process.env.DM_DOWNLOAD_ROOT = './some-downloads';
    expect(resolveDownloadRoot()).toBe(resolve(process.cwd(), 'some-downloads'));
    process.env.DM_DOWNLOAD_ROOT = saved;
  });
});

describe('storage.service · 列目录', () => {
  it('缺省列出根目录，只含目录、不含文件，按名称排序', async () => {
    const listing = await listDirectories(undefined);

    expect(listing.root).toBe(root);
    expect(listing.path).toBe(root);
    expect(listing.parent).toBeNull();
    expect(listing.writable).toBe(true);
    expect(listing.truncated).toBe(false);
    expect(listing.directories.map((d) => d.name)).toEqual([
      'movies',
      'music',
      'nested',
      '中文目录',
    ]);
    // 路径必须是服务端子目录的绝对路径（前端直接回传它做下一跳）
    expect(listing.directories[0].path).toBe(join(root, 'movies'));
    expect(listing.directories.some((d) => d.name === 'notes.txt')).toBe(false);
  });

  it('相对路径按「相对下载根目录」解释', async () => {
    const listing = await listDirectories('nested');

    expect(listing.path).toBe(join(root, 'nested'));
    expect(listing.parent).toBe(root);
    expect(listing.directories.map((d) => d.name)).toEqual(['deep']);
  });

  it('绝对路径（根目录之内）可用', async () => {
    const listing = await listDirectories(join(root, 'nested', 'deep'));

    expect(listing.path).toBe(join(root, 'nested', 'deep'));
    expect(listing.parent).toBe(join(root, 'nested'));
  });

  it('根目录不存在时自动创建', async () => {
    const saved = process.env.DM_DOWNLOAD_ROOT;
    const fresh = join(outside, 'brand-new-root');
    process.env.DM_DOWNLOAD_ROOT = fresh;

    try {
      const listing = await listDirectories(undefined);
      expect(listing.path).toBe(fresh);
      expect(listing.directories).toEqual([]);
      expect((await stat(fresh)).isDirectory()).toBe(true);
    } finally {
      process.env.DM_DOWNLOAD_ROOT = saved;
    }
  });
});

describe('storage.service · 越界防护（信任边界）', () => {
  it('`..` 穿越被拒（403）', async () => {
    await expectAppError(listDirectories('../..'), 'FORBIDDEN', 403);
    await expectAppError(listDirectories('nested/../..'), 'FORBIDDEN', 403);
  });

  it('根目录之外的绝对路径被拒（403）', async () => {
    await expectAppError(listDirectories(outside), 'FORBIDDEN', 403);
    await expectAppError(listDirectories(resolve(root, '..')), 'FORBIDDEN', 403);
  });

  it('同前缀的兄弟目录不被误判为根目录之内（403）', async () => {
    // 前缀字符串比较会把 /…/downloads-evil 当成 /…/downloads 的子路径，
    // 这里锁死「用 path.relative 判定」的行为
    const sibling = `${root}-evil`;
    await mkdir(sibling, { recursive: true });
    try {
      await expectAppError(listDirectories(sibling), 'FORBIDDEN', 403);
    } finally {
      await rm(sibling, { recursive: true, force: true });
    }
  });

  it('指向根目录之外的软链接被拒（403）；创建软链接需权限，环境不支持则跳过', async () => {
    const link = join(root, 'escape-link');
    try {
      await symlink(outside, link, 'dir');
    } catch {
      return; // Windows 非开发者模式/非管理员：无法创建符号链接，跳过
    }
    try {
      await expectAppError(listDirectories(link), 'FORBIDDEN', 403);
    } finally {
      await rm(link, { force: true });
    }
  });
});

describe('storage.service · 非法目标', () => {
  it('目录不存在返回 404', async () => {
    await expectAppError(listDirectories('no-such-dir'), 'NOT_FOUND', 404);
  });

  it('目标是文件而非目录返回 400', async () => {
    await expectAppError(listDirectories('notes.txt'), 'INVALID_PATH', 400);
  });
});

describe('storage.service · assertUsableDownloadDir（保存设置前的校验）', () => {
  it('合法目录返回归一化后的绝对路径', async () => {
    await expect(assertUsableDownloadDir('nested')).resolves.toBe(join(root, 'nested'));
    await expect(assertUsableDownloadDir(join(root, 'movies'))).resolves.toBe(
      join(root, 'movies'),
    );
  });

  it('越界 / 不存在 / 不是目录 分别被拒', async () => {
    await expectAppError(assertUsableDownloadDir(outside), 'FORBIDDEN', 403);
    await expectAppError(assertUsableDownloadDir('nope'), 'NOT_FOUND', 404);
    await expectAppError(assertUsableDownloadDir('notes.txt'), 'INVALID_PATH', 400);
  });
});
