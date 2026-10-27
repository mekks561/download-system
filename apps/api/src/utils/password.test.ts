import { describe, it, expect } from 'vitest';
import { generateStrongPassword } from './password.js';

describe('generateStrongPassword', () => {
  it('默认生成 16 位', () => {
    expect(generateStrongPassword()).toHaveLength(16);
  });

  it('支持自定义长度', () => {
    expect(generateStrongPassword(24)).toHaveLength(24);
  });

  it('长度小于 8 位时拒绝生成', () => {
    expect(() => generateStrongPassword(6)).toThrow();
  });

  it('每次生成的密码都不同（不存在固定口令）', () => {
    const set = new Set(Array.from({ length: 50 }, () => generateStrongPassword()));
    expect(set.size).toBe(50);
  });

  it('必然包含大写/小写/数字/符号四类字符', () => {
    for (let i = 0; i < 30; i++) {
      const pwd = generateStrongPassword();
      expect(pwd).toMatch(/[A-Z]/);
      expect(pwd).toMatch(/[a-z]/);
      expect(pwd).toMatch(/[0-9]/);
      expect(pwd).toMatch(/[!@#$%^&*\-_=+]/);
    }
  });

  it('不含易混淆字符（I l 0 O 1）', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateStrongPassword()).not.toMatch(/[Il0O1]/);
    }
  });

  it('首四位不固定为「大写+小写+数字+符号」的可预测模式', () => {
    // 洗牌前该模式恒定成立；洗牌后 100 次里不应每次都命中
    const alwaysPredictable = Array.from({ length: 100 }, () => generateStrongPassword()).every(
      (p) =>
        /[A-Z]/.test(p[0]!) &&
        /[a-z]/.test(p[1]!) &&
        /[0-9]/.test(p[2]!) &&
        /[!@#$%^&*\-_=+]/.test(p[3]!),
    );
    expect(alwaysPredictable).toBe(false);
  });
});
