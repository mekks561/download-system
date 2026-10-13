import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * activity.service 边界回归（mock prisma，不连库）。
 *
 * 重点验证三条契约：
 *  1. `recordActivity` **永不抛错** —— 活动流是旁路，任何 DB 失败都不能影响主流程；
 *  2. 字段截断严格对齐 DB 列宽（type 50 / description 500），且按**码点**截断，
 *     不能把 emoji 的代理对切成半个字符（utf8mb4 下会直接报错）；
 *  3. metadata 归一化 —— BigInt / Infinity / undefined / 函数 都不能污染 Json 列。
 */
const { activityCreate } = vi.hoisted(() => ({ activityCreate: vi.fn() }));

vi.mock('../config/prisma', () => ({
  prisma: { activity: { create: activityCreate } },
}));

import {
  recordActivity,
  buildDownloadActivity,
  recordDownloadActivity,
  MAX_ACTIVITY_TYPE,
  MAX_ACTIVITY_DESCRIPTION,
} from './activity.service';

/** 取第 n 次调用的 data 载荷 */
function dataOfCall(n = 0): Record<string, unknown> {
  return (activityCreate.mock.calls[n] as [{ data: Record<string, unknown> }])[0].data;
}

/** 是否含落单的代理码元（0xD800–0xDFFF 未被成对消费即视为破损） */
function hasLoneSurrogate(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

describe('recordActivity', () => {
  beforeEach(() => {
    activityCreate.mockReset();
    activityCreate.mockResolvedValue({ id: 1 });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('正常写入：userId / type / description / metadata 原样落库', async () => {
    await recordActivity({
      userId: 7,
      type: 'download',
      description: '下载完成：a.zip',
      metadata: { filename: 'a.zip', status: 'completed', size: 123 },
    });

    expect(activityCreate).toHaveBeenCalledOnce();
    expect(dataOfCall()).toEqual({
      userId: 7,
      type: 'download',
      description: '下载完成：a.zip',
      metadata: { filename: 'a.zip', status: 'completed', size: 123 },
    });
  });

  it('未传 metadata 时不产生 metadata 键（让 DB 用 NULL 而非空对象）', async () => {
    await recordActivity({ userId: 1, type: 'download', description: 'x' });

    expect(dataOfCall()).not.toHaveProperty('metadata');
  });

  it('description 超 500 码点被截断，且结果恰好 500 码点', async () => {
    await recordActivity({ userId: 1, type: 'download', description: 'a'.repeat(900) });

    const { description } = dataOfCall() as { description: string };
    expect(Array.from(description)).toHaveLength(MAX_ACTIVITY_DESCRIPTION);
    expect(description.endsWith('…')).toBe(true);
  });

  it('type 超 50 码点被截断到 50', async () => {
    await recordActivity({ userId: 1, type: 't'.repeat(120), description: 'x' });

    const { type } = dataOfCall() as { type: string };
    expect(Array.from(type)).toHaveLength(MAX_ACTIVITY_TYPE);
  });

  it('emoji 长串按码点截断，不产生落单代理码元', async () => {
    await recordActivity({ userId: 1, type: 'download', description: '🎬'.repeat(600) });

    const { description } = dataOfCall() as { description: string };
    expect(Array.from(description)).toHaveLength(MAX_ACTIVITY_DESCRIPTION);
    expect(hasLoneSurrogate(description)).toBe(false);
  });

  it('控制字符被剔除，首尾空白被裁掉', async () => {
    await recordActivity({
      userId: 1,
      type: 'download',
      description: '  下载\u0000完成\u001f：bad\u007f.txt  ',
    });

    expect((dataOfCall() as { description: string }).description).toBe('下载完成：bad.txt');
  });

  it('description 清洗后为空 → 静默跳过，不写库', async () => {
    await recordActivity({ userId: 1, type: 'download', description: '   \u0000\u0001  ' });

    expect(activityCreate).not.toHaveBeenCalled();
  });

  it('prisma 抛错时不向上冒泡（旁路记录不得拖垮主流程）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    activityCreate.mockRejectedValue(new Error('ER_DATA_TOO_LONG'));

    await expect(
      recordActivity({ userId: 1, type: 'download', description: 'x' }),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledOnce();
  });

  it('prisma 抛非 Error 值（字符串）也不冒泡', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    activityCreate.mockRejectedValue('boom');

    await expect(
      recordActivity({ userId: 1, type: 'download', description: 'x' }),
    ).resolves.toBeUndefined();
  });

  it('metadata 归一化：BigInt→number、Infinity→null、undefined 键被丢弃', async () => {
    await recordActivity({
      userId: 1,
      type: 'download',
      description: 'x',
      metadata: { size: 10n, bad: Number.POSITIVE_INFINITY, gone: undefined, ok: 'y' },
    });

    expect(dataOfCall().metadata).toEqual({ size: 10, bad: null, ok: 'y' });
  });

  it('metadata 里超出安全整数范围的 BigInt 退化为字符串，避免精度静默丢失', async () => {
    await recordActivity({
      userId: 1,
      type: 'download',
      description: 'x',
      metadata: { huge: 9007199254740993n },
    });

    expect(dataOfCall().metadata).toEqual({ huge: '9007199254740993' });
  });
});

describe('buildDownloadActivity', () => {
  it('成功：描述带「下载完成：」前缀，metadata 有 size、无 url', () => {
    const payload = buildDownloadActivity({
      userId: 3,
      filename: 'movie.mkv',
      status: 'completed',
      size: 4096,
    });

    expect(payload).toEqual({
      userId: 3,
      type: 'download',
      description: '下载完成：movie.mkv',
      metadata: { filename: 'movie.mkv', status: 'completed', size: 4096 },
    });
  });

  it('成功但未提供 size：metadata 不含 size 键', () => {
    const payload = buildDownloadActivity({ userId: 1, filename: 'a', status: 'completed' });

    expect(payload.metadata).not.toHaveProperty('size');
  });

  it('失败：描述带「下载失败：」前缀，metadata 记 url、不含 size', () => {
    const payload = buildDownloadActivity({
      userId: 5,
      filename: 'big.iso',
      status: 'error',
      size: 999,
      url: 'https://example.com/big.iso',
    });

    expect(payload.description).toBe('下载失败：big.iso');
    expect(payload.metadata).toEqual({
      filename: 'big.iso',
      status: 'error',
      url: 'https://example.com/big.iso',
    });
  });

  it('文件名为空或全为控制字符 → 回落成「(未命名)」，不产生残句', () => {
    const payload = buildDownloadActivity({ userId: 1, filename: '  \u0000 ', status: 'completed' });

    expect(payload.description).toBe('下载完成：(未命名)');
    expect(payload.metadata).toMatchObject({ filename: '(未命名)' });
  });

  it('BigInt 字节数原样保留在 metadata（由 recordActivity 归一化）', () => {
    const payload = buildDownloadActivity({
      userId: 1,
      filename: 'a.bin',
      status: 'completed',
      size: 38_458_892n,
    });

    expect(payload.metadata?.size).toBe(38_458_892n);
  });

  it('recordDownloadActivity 一步完成构造 + 写入', async () => {
    activityCreate.mockReset();
    activityCreate.mockResolvedValue({ id: 1 });

    await recordDownloadActivity({
      userId: 2,
      filename: 'z.zip',
      status: 'completed',
      size: 10,
    });

    expect(activityCreate).toHaveBeenCalledOnce();
    expect(dataOfCall()).toMatchObject({
      userId: 2,
      type: 'download',
      description: '下载完成：z.zip',
    });
  });
});
