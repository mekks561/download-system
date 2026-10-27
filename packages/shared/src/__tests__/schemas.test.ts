import { describe, it, expect } from 'vitest';
import {
  UserSchema, DownloadSchema, DownloadCreateSchema,
  ApiSuccessSchema, ApiErrorSchema,
} from '../index.js';

describe('shared schemas smoke test', () => {
  it('DownloadCreateSchema 校验合法 URL', () => {
    const r = DownloadCreateSchema.safeParse({ url: 'https://example.com/f.zip' });
    expect(r.success).toBe(true);
  });

  it('DownloadCreateSchema 拒绝非法 URL', () => {
    const r = DownloadCreateSchema.safeParse({ url: 'not-a-url' });
    expect(r.success).toBe(false);
  });

  it('DownloadCreateSchema 接受磁力链接与 base64 种子', () => {
    const magnet = DownloadCreateSchema.safeParse({
      url: 'magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a',
    });
    expect(magnet.success).toBe(true);

    // 建任务时允许传种子，但 BT 引擎下线，实际下载会在控制器/worker 被拒
    const seed = DownloadCreateSchema.safeParse({
      url: 'data:application/x-bittorrent;base64,ZDU6aW5mbw==',
    });
    expect(seed.success).toBe(true);

    // 只有 magnet 头、没有 xt（infoHash）的不算合法磁力链接
    expect(DownloadCreateSchema.safeParse({ url: 'magnet:?dn=foo' }).success).toBe(false);
  });

  it('ApiSuccessSchema 包裹数据', () => {
    const r = ApiSuccessSchema(UserSchema).safeParse({
      success: true,
      data: { id: 1, username: 'abc', email: 'a@b.com', password: 'x', role: 'user', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(r.success).toBe(true);
  });

  it('ApiErrorSchema 校验错误信封', () => {
    const r = ApiErrorSchema.safeParse({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'bad' },
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(r.success).toBe(true);
  });
});
