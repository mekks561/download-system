import 'dotenv/config';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// 单测隔离数据库：本服务会写 app_settings 表，打真库会污染开发数据
vi.mock('../config/prisma', () => ({
  prisma: { appSetting: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

import { prisma } from '../config/prisma.js';
import {
  DEFAULT_DOWNLOAD_SETTINGS,
  getDownloadSettings,
  saveDownloadSettings,
} from './settings.service.js';

const mock = prisma as unknown as {
  appSetting: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

let root: string;
let outside: string;

beforeAll(async () => {
  const base = await mkdtemp(join(tmpdir(), 'dm-settings-'));
  root = join(base, 'downloads');
  outside = join(base, 'outside');
  await mkdir(join(root, 'movies'), { recursive: true });
  await mkdir(outside, { recursive: true });
  process.env.DM_DOWNLOAD_ROOT = root;
});

afterAll(async () => {
  delete process.env.DM_DOWNLOAD_ROOT;
  if (root) await rm(resolve(root, '..'), { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('settings.service · 读取下载设置', () => {
  it('从未配置过 → 返回默认值且 configured=false', async () => {
    mock.appSetting.findUnique.mockResolvedValue(null);

    await expect(getDownloadSettings()).resolves.toEqual({
      ...DEFAULT_DOWNLOAD_SETTINGS,
      configured: false,
    });
  });

  it('已配置 → 解析库里的 JSON 并置 configured=true', async () => {
    mock.appSetting.findUnique.mockResolvedValue({
      key: 'download.config',
      value: JSON.stringify({
        downloadDir: '/data/downloads',
        maxConcurrent: 3,
        speedLimitKBps: 512,
      }),
    });

    await expect(getDownloadSettings()).resolves.toEqual({
      downloadDir: '/data/downloads',
      maxConcurrent: 3,
      speedLimitKBps: 512,
      configured: true,
    });
  });

  it('库里是坏 JSON / 不符合契约 → 回落默认值，不抛错也不冒充已配置', async () => {
    // 手改过库或旧版本格式：宁可当没配过，也不能把脏数据当成用户选择
    mock.appSetting.findUnique.mockResolvedValue({ key: 'download.config', value: '{不是 JSON' });
    await expect(getDownloadSettings()).resolves.toEqual({
      ...DEFAULT_DOWNLOAD_SETTINGS,
      configured: false,
    });

    mock.appSetting.findUnique.mockResolvedValue({
      key: 'download.config',
      value: JSON.stringify({ downloadDir: '/data/downloads', maxConcurrent: 99 }),
    });
    await expect(getDownloadSettings()).resolves.toEqual({
      ...DEFAULT_DOWNLOAD_SETTINGS,
      configured: false,
    });
  });
});

describe('settings.service · 保存下载设置', () => {
  it('相对路径会被归一化为服务端绝对路径后落库', async () => {
    mock.appSetting.upsert.mockResolvedValue({});

    const saved = await saveDownloadSettings({
      downloadDir: 'movies',
      maxConcurrent: 4,
      speedLimitKBps: 1024,
      sensitiveKeywords: [],
      autoCleanupDays: 7,
    });

    expect(saved).toEqual({
      downloadDir: join(root, 'movies'),
      maxConcurrent: 4,
      speedLimitKBps: 1024,
      configured: true,
    });

    const arg = mock.appSetting.upsert.mock.calls[0][0] as {
      where: { key: string };
      create: { value: string };
    };
    expect(arg.where).toEqual({ key: 'download.config' });
    expect(JSON.parse(arg.create.value)).toEqual({
      downloadDir: join(root, 'movies'),
      maxConcurrent: 4,
      speedLimitKBps: 1024,
    });
  });

  it('目录越界 / 不存在时直接拒绝，且不写库', async () => {
    await expect(
      saveDownloadSettings({
        downloadDir: outside,
        maxConcurrent: 5,
        speedLimitKBps: 0,
        sensitiveKeywords: [],
        autoCleanupDays: 7,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(
      saveDownloadSettings({
        downloadDir: 'no-such-dir',
        maxConcurrent: 5,
        speedLimitKBps: 0,
        sensitiveKeywords: [],
        autoCleanupDays: 7,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });

    // 关键：不能留下「配置成功但根本不能用」的目录
    expect(mock.appSetting.upsert).not.toHaveBeenCalled();
  });
});
