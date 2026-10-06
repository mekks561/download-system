import { describe, it, expect } from 'vitest';
import {
  GmLoginSchema,
  GmResetPasswordSchema,
  GmUserQuerySchema,
  GmUserUpdateSchema,
  GmDownloadQuerySchema,
} from '../schemas/gm';
import { UserResponseSchema } from '../schemas/user';

describe('GM shared 契约（zod v4）', () => {
  describe('GmLoginSchema', () => {
    it('接受非空 username/password', () => {
      const r = GmLoginSchema.safeParse({ username: 'gm-admin', password: 's3cr3t!' });
      expect(r.success).toBe(true);
    });

    it.each([
      ['空用户名', { username: '', password: 'x' }],
      ['缺密码', { username: 'admin' }],
      ['用户名非字符串', { username: 1, password: 'x' }],
    ])('%s 被拒', (_name, input) => {
      expect(GmLoginSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('GmResetPasswordSchema', () => {
    it('接受 8-128 位新密码', () => {
      expect(GmResetPasswordSchema.safeParse({ newPassword: '12345678' }).success).toBe(true);
    });
    it('拒绝短于 8 位', () => {
      expect(GmResetPasswordSchema.safeParse({ newPassword: 'short' }).success).toBe(false);
    });
    it('拒绝长于 128 位', () => {
      expect(GmResetPasswordSchema.safeParse({ newPassword: 'a'.repeat(129) }).success).toBe(false);
    });
  });

  describe('GmUserQuerySchema（分页/搜索/角色）', () => {
    it('空输入落默认 page=1 pageSize=20', () => {
      const r = GmUserQuerySchema.parse({});
      expect(r.page).toBe(1);
      expect(r.pageSize).toBe(20);
    });

    it('coerce 字符串数字', () => {
      const r = GmUserQuerySchema.parse({ page: '3', pageSize: '50', search: 'bob' });
      expect(r.page).toBe(3);
      expect(r.pageSize).toBe(50);
      expect(r.search).toBe('bob');
    });

    it('pageSize > 100 被拒（硬上限）', () => {
      expect(GmUserQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
    });

    it('pageSize=0 / 负数 / 非数字 被拒', () => {
      expect(GmUserQuerySchema.safeParse({ pageSize: '0' }).success).toBe(false);
      expect(GmUserQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
      expect(GmUserQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
    });

    it('非法 role 被拒，合法 user/admin 通过', () => {
      expect(GmUserQuerySchema.safeParse({ role: 'superadmin' }).success).toBe(false);
      expect(GmUserQuerySchema.safeParse({ role: 'user' }).success).toBe(true);
      expect(GmUserQuerySchema.safeParse({ role: 'admin' }).success).toBe(true);
    });
  });

  describe('GmUserUpdateSchema（白名单）', () => {
    it('接受 role/isActive 部分更新', () => {
      expect(GmUserUpdateSchema.safeParse({ role: 'admin' }).success).toBe(true);
      expect(GmUserUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
    });
    it('拒绝非法 role 与非布尔 isActive', () => {
      expect(GmUserUpdateSchema.safeParse({ role: 'root' }).success).toBe(false);
      expect(GmUserUpdateSchema.safeParse({ isActive: 'false' }).success).toBe(false);
    });
  });

  describe('GmDownloadQuerySchema', () => {
    it('coerce userId 字符串并带默认分页', () => {
      const r = GmDownloadQuerySchema.parse({ userId: '42' });
      expect(r.userId).toBe(42);
      expect(r.page).toBe(1);
      expect(r.pageSize).toBe(20);
    });
    it('非法 userId 被拒', () => {
      expect(GmDownloadQuerySchema.safeParse({ userId: 'x' }).success).toBe(false);
      expect(GmDownloadQuerySchema.safeParse({ userId: '0' }).success).toBe(false);
    });
  });

  describe('UserResponseSchema 含 isActive（GM 禁用开关）', () => {
    it('序列化用户带 isActive；缺省由 schema 补默认 true', () => {
      const r = UserResponseSchema.parse({
        id: 1,
        username: 'u12',
        email: 'u1@t.com',
        role: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      expect(r.isActive).toBe(true);
      expect(r).not.toHaveProperty('password');
    });
  });
});
