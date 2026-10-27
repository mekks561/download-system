import { describe, it, expect } from 'vitest';
import {
  DownloadSettingsSchema,
  DownloadSettingsUpdateSchema,
  OnboardingStep3Schema,
  StorageBrowseQuerySchema,
  StorageListingSchema,
} from '../index.js';

/**
 * 服务端目录浏览 / 下载设置的契约冒烟测试。
 *
 * 重点锁两件事：
 * 1. 路径类字段的长度上限（避免超大字符串进后端）；
 * 2. 「保存下载设置」与「向导 Step 3」确实是同一份契约——两处一旦分裂，
 *    就会出现「向导里能填、设置页被拒」这种莫名其妙的行为。
 */
describe('StorageListingSchema', () => {
  const valid = {
    root: '/data/downloads',
    path: '/data/downloads',
    parent: null,
    writable: true,
    directories: [{ name: 'movies', path: '/data/downloads/movies' }],
    truncated: false,
  };

  it('接受完整的目录列表', () => {
    expect(StorageListingSchema.safeParse(valid).success).toBe(true);
  });

  it('拒绝缺少 writable / truncated 的响应（契约字段不可省）', () => {
    const { writable: _w, ...withoutWritable } = valid;
    expect(StorageListingSchema.safeParse(withoutWritable).success).toBe(false);

    const { truncated: _t, ...withoutTruncated } = valid;
    expect(StorageListingSchema.safeParse(withoutTruncated).success).toBe(false);
  });

  it('拒绝超长路径（>4096）', () => {
    const r = StorageListingSchema.safeParse({
      ...valid,
      path: `/${'a'.repeat(5000)}`,
    });
    expect(r.success).toBe(false);
  });
});

describe('StorageBrowseQuerySchema', () => {
  it('path 可省略（缺省表示根目录）', () => {
    expect(StorageBrowseQuerySchema.safeParse({}).success).toBe(true);
  });

  it('拒绝非字符串 path（如数组形式 ?path=a&path=b）', () => {
    expect(StorageBrowseQuerySchema.safeParse({ path: ['a', 'b'] }).success).toBe(false);
  });
});

describe('下载设置契约', () => {
  it('保存用的 schema 与向导 Step 3 是同一份（防两处漂移）', () => {
    expect(DownloadSettingsUpdateSchema).toBe(OnboardingStep3Schema);
  });

  it('coerce 兼容表单字符串：maxConcurrent/speedLimitKBps 归一化为数字', () => {
    const r = DownloadSettingsUpdateSchema.safeParse({
      downloadDir: '/data/downloads',
      maxConcurrent: '3',
      speedLimitKBps: '512',
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data).toEqual({
      downloadDir: '/data/downloads',
      maxConcurrent: 3,
      speedLimitKBps: 512,
    });
  });

  it('拒绝空的下载目录与越界并发数', () => {
    expect(
      DownloadSettingsUpdateSchema.safeParse({ downloadDir: '', maxConcurrent: 5 }).success,
    ).toBe(false);
    expect(
      DownloadSettingsUpdateSchema.safeParse({ downloadDir: '/dl', maxConcurrent: 99 }).success,
    ).toBe(false);
  });

  it('读取响应允许空目录 + configured:false（未配置态）', () => {
    const r = DownloadSettingsSchema.safeParse({
      downloadDir: '',
      maxConcurrent: 5,
      speedLimitKBps: 0,
      configured: false,
    });
    expect(r.success).toBe(true);
  });
});
