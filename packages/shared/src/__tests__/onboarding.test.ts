import { describe, it, expect } from 'vitest';
import {
  OnboardingStep2Schema,
  OnboardingStep3Schema,
  OnboardingStatusSchema,
} from '../index.js';

describe('OnboardingStep2Schema', () => {
  it('接受合法的管理员输入', () => {
    const r = OnboardingStep2Schema.safeParse({
      username: 'admin01',
      email: 'admin@dm.local',
      password: 'StrongPass123',
    });
    expect(r.success).toBe(true);
  });

  it('拒绝过短的用户名', () => {
    const r = OnboardingStep2Schema.safeParse({
      username: 'ab',
      email: 'a@b.com',
      password: 'StrongPass123',
    });
    expect(r.success).toBe(false);
  });

  it('拒绝非法邮箱', () => {
    const r = OnboardingStep2Schema.safeParse({
      username: 'admin01',
      email: 'not-an-email',
      password: 'StrongPass123',
    });
    expect(r.success).toBe(false);
  });

  it('拒绝弱密码（少于 8 位）', () => {
    const r = OnboardingStep2Schema.safeParse({
      username: 'admin01',
      email: 'a@b.com',
      password: '123',
    });
    expect(r.success).toBe(false);
  });

  it('拒绝含非法字符的用户名', () => {
    const r = OnboardingStep2Schema.safeParse({
      username: 'admin-01',
      email: 'a@b.com',
      password: 'StrongPass123',
    });
    expect(r.success).toBe(false);
  });

  it('错误信息为中文，可直接展示给用户', () => {
    const r = OnboardingStep2Schema.safeParse({
      username: 'admin01',
      email: 'a@b.com',
      password: '123',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toContain('密码');
    }
  });
});

describe('OnboardingStep3Schema', () => {
  it('补齐默认值', () => {
    const r = OnboardingStep3Schema.parse({
      downloadDir: '/tmp/downloads',
    });
    expect(r.maxConcurrent).toBe(5);
    expect(r.speedLimitKBps).toBe(0);
  });

  it('拒绝空下载目录', () => {
    const r = OnboardingStep3Schema.safeParse({ downloadDir: '' });
    expect(r.success).toBe(false);
  });

  it('拒绝 maxConcurrent 超过 10', () => {
    const r = OnboardingStep3Schema.safeParse({
      downloadDir: '/tmp/dl',
      maxConcurrent: 20,
    });
    expect(r.success).toBe(false);
  });

  it('把表单字符串强制转成数字', () => {
    const r = OnboardingStep3Schema.parse({
      downloadDir: '/tmp/dl',
      maxConcurrent: '3',
      speedLimitKBps: '128',
    });
    expect(r.maxConcurrent).toBe(3);
    expect(r.speedLimitKBps).toBe(128);
  });
});

describe('OnboardingStatusSchema', () => {
  it('只接受布尔值 needsSetup', () => {
    expect(OnboardingStatusSchema.safeParse({ needsSetup: true }).success).toBe(true);
    expect(OnboardingStatusSchema.safeParse({ needsSetup: 0 }).success).toBe(false);
  });
});
