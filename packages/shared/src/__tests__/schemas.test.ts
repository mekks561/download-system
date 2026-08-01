import { describe, it, expect } from 'vitest';
import {
  UserSchema, DownloadSchema, DownloadCreateSchema,
  ApiSuccessSchema, ApiErrorSchema,
} from '../index';

describe('shared schemas smoke test', () => {
  it('DownloadCreateSchema 校验合法 URL', () => {
    const r = DownloadCreateSchema.safeParse({ url: 'https://example.com/f.zip' });
    expect(r.success).toBe(true);
  });

  it('DownloadCreateSchema 拒绝非法 URL', () => {
    const r = DownloadCreateSchema.safeParse({ url: 'not-a-url' });
    expect(r.success).toBe(false);
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
