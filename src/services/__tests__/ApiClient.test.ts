﻿import { apiClient } from '../ApiClient';
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
