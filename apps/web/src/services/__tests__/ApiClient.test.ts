﻿import { apiClient, extractApiError } from '../ApiClient';
import type { ApiResponse, PaginatedResponse } from '../ApiClient';

describe('ApiClient', () => {
  beforeEach(() => {
    localStorage.removeItem('token');
  });

  describe('API响应结构', () => {
    it('应该定义ApiResponse接口', () => {
      const response: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
        message: 'Success',
      };
      expect(response.success).toBeDefined();
      expect(response.data).toBeDefined();
    });

    it('应该定义PaginatedResponse接口', () => {
      const response: PaginatedResponse<unknown[]> = {
        success: true,
        data: [],
        total: 10,
        page: 1,
        pageSize: 10,
      };
      expect(response.total).toBeDefined();
      expect(response.page).toBeDefined();
    });
  });

  describe('apiClient实例', () => {
    it('应该存在apiClient实例', () => {
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
      expect(typeof apiClient.put).toBe('function');
      expect(typeof apiClient.patch).toBe('function');
      expect(typeof apiClient.delete).toBe('function');
      expect(typeof apiClient.upload).toBe('function');
    });

    it('应该有正确的类型', () => {
      expect(apiClient).not.toBeNull();
    });
  });
});

/**
 * 回归：注册接口返回 400 时，界面必须显示后端的中文原因，
 * 而不是 axios 的 "Request failed with status code 400"。
 */
describe('extractApiError', () => {
  it('从契约信封 { error: { code, message } } 中取出中文信息', () => {
    const result = extractApiError({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '密码至少 8 个字符' },
      timestamp: '2026-09-30T00:00:00.000Z',
    });

    expect(result.message).toBe('密码至少 8 个字符');
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('兼容 error 为字符串的旧写法', () => {
    const result = extractApiError({ success: false, message: '邮箱已存在', error: 'CONFLICT' });

    expect(result.message).toBe('邮箱已存在');
    expect(result.code).toBe('CONFLICT');
  });

  it('信封缺失时返回空对象，由调用方回落到 axios 信息', () => {
    expect(extractApiError(undefined)).toEqual({});
    expect(extractApiError('plain text')).toEqual({});
  });

  it('只有 details 没有 message 时不编造信息', () => {
    const result = extractApiError({
      success: false,
      error: { code: 'VALIDATION_ERROR', details: { fieldErrors: { password: ['too short'] } } },
    });

    expect(result.message).toBeUndefined();
    expect(result.code).toBe('VALIDATION_ERROR');
  });
});
