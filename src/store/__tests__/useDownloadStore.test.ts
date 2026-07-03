import { act } from '@testing-library/react';
import { useDownloadStore } from '../useDownloadStore';
import { DownloadItem } from '../../types';

describe('useDownloadStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDownloadStore.getState().setDownloads([]);
    useDownloadStore.getState().setLoading(false);
    useDownloadStore.getState().setError(null);
    useDownloadStore.getState().setStatusFilter('all');
  });

  const getInitialState = () => ({
    downloads: [],
    isLoading: false,
    error: null,
    statusFilter: 'all',
  });

  const createMockDownload = (id: string, status: DownloadItem['status'] = 'pending'): DownloadItem => ({
    id,
    url: `https://example.com/${id}.zip`,
    filename: `${id}.zip`,
    status,
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 1000000,
    speed: 0,
    resumePosition: 0,
    createdAt: Date.now(),
    priority: 'normal',
  });

  describe('初始化状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useDownloadStore.getState();
      expect(store.downloads).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.statusFilter).toBe('all');
    });
  });

  describe('setDownloads', () => {
    it('应该设置下载列表', () => {
      const mockDownloads = [createMockDownload('1'), createMockDownload('2')];

      act(() => {
        useDownloadStore.getState().setDownloads(mockDownloads);
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(2);
      expect(store.downloads[0].id).toBe('1');
      expect(store.downloads[1].id).toBe('2');
    });

    it('应该替换整个下载列表', () => {
      const initialDownloads = [createMockDownload('1')];
      const newDownloads = [createMockDownload('2'), createMockDownload('3')];

      act(() => {
        useDownloadStore.getState().setDownloads(initialDownloads);
      });

      act(() => {
        useDownloadStore.getState().setDownloads(newDownloads);
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(2);
      expect(store.downloads[0].id).toBe('2');
      expect(store.downloads[1].id).toBe('3');
    });
  });

  describe('addDownload', () => {
    it('应该添加单个下载', () => {
      const mockDownload = createMockDownload('1');

      act(() => {
        useDownloadStore.getState().addDownload(mockDownload);
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(1);
      expect(store.downloads[0].id).toBe('1');
    });

    it('应该添加多个下载', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1'));
        useDownloadStore.getState().addDownload(createMockDownload('2'));
        useDownloadStore.getState().addDownload(createMockDownload('3'));
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(3);
    });

    it('应该保持原有下载不变', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1'));
      });

      const storeBefore = useDownloadStore.getState();
      const firstDownload = storeBefore.downloads[0];

      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('2'));
      });

      const storeAfter = useDownloadStore.getState();
      expect(storeAfter.downloads[0]).toBe(firstDownload);
    });
  });

  describe('updateDownload', () => {
    it('应该更新指定下载的状态', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1', 'pending'));
      });

      act(() => {
        useDownloadStore.getState().updateDownload('1', { status: 'downloading', progress: 50 });
      });

      const store = useDownloadStore.getState();
      const download = store.downloads.find(d => d.id === '1');
      expect(download?.status).toBe('downloading');
      expect(download?.progress).toBe(50);
    });

    it('应该只更新指定的下载', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1', 'pending'));
        useDownloadStore.getState().addDownload(createMockDownload('2', 'pending'));
      });

      act(() => {
        useDownloadStore.getState().updateDownload('1', { status: 'completed' });
      });

      const store = useDownloadStore.getState();
      expect(store.downloads[0].status).toBe('completed');
      expect(store.downloads[1].status).toBe('pending');
    });

    it('应该更新多个字段', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1'));
      });

      act(() => {
        useDownloadStore.getState().updateDownload('1', {
          status: 'downloading',
          progress: 30,
          downloadedBytes: 300000,
          speed: 100000,
        });
      });

      const store = useDownloadStore.getState();
      const download = store.downloads.find(d => d.id === '1');
      expect(download?.status).toBe('downloading');
      expect(download?.progress).toBe(30);
      expect(download?.downloadedBytes).toBe(300000);
      expect(download?.speed).toBe(100000);
    });

    it('应该处理不存在的下载ID', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1'));
      });

      act(() => {
        useDownloadStore.getState().updateDownload('non-existent', { status: 'completed' });
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(1);
      expect(store.downloads[0].id).toBe('1');
    });
  });

  describe('removeDownload', () => {
    it('应该移除指定的下载', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1'));
        useDownloadStore.getState().addDownload(createMockDownload('2'));
      });

      act(() => {
        useDownloadStore.getState().removeDownload('1');
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(1);
      expect(store.downloads[0].id).toBe('2');
    });

    it('应该处理不存在的下载ID', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1'));
      });

      act(() => {
        useDownloadStore.getState().removeDownload('non-existent');
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(1);
    });

    it('应该移除所有下载', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1'));
        useDownloadStore.getState().addDownload(createMockDownload('2'));
      });

      act(() => {
        useDownloadStore.getState().removeDownload('1');
        useDownloadStore.getState().removeDownload('2');
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toEqual([]);
    });
  });

  describe('clearCompleted', () => {
    it('应该只移除completed状态的下载', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1', 'completed'));
        useDownloadStore.getState().addDownload(createMockDownload('2', 'downloading'));
        useDownloadStore.getState().addDownload(createMockDownload('3', 'pending'));
        useDownloadStore.getState().addDownload(createMockDownload('4', 'completed'));
      });

      act(() => {
        useDownloadStore.getState().clearCompleted();
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(2);
      expect(store.downloads[0].id).toBe('2');
      expect(store.downloads[1].id).toBe('3');
    });

    it('应该处理空列表', () => {
      act(() => {
        useDownloadStore.getState().clearCompleted();
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toEqual([]);
    });

    it('应该处理没有completed下载的情况', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1', 'pending'));
        useDownloadStore.getState().addDownload(createMockDownload('2', 'downloading'));
      });

      act(() => {
        useDownloadStore.getState().clearCompleted();
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(2);
    });
  });

  describe('setStatusFilter', () => {
    it('应该设置状态过滤器', () => {
      act(() => {
        useDownloadStore.getState().setStatusFilter('downloading');
      });

      const store = useDownloadStore.getState();
      expect(store.statusFilter).toBe('downloading');
    });

    it('应该支持所有状态值', () => {
      const statuses: (DownloadItem['status'] | 'all')[] = [
        'all', 'pending', 'downloading', 'paused', 'completed', 'error', 'cancelled', 'retrying'
      ];

      statuses.forEach(status => {
        act(() => {
          useDownloadStore.getState().setStatusFilter(status);
        });

        const store = useDownloadStore.getState();
        expect(store.statusFilter).toBe(status);
      });
    });

    it('初始值应该是all', () => {
      const store = useDownloadStore.getState();
      expect(store.statusFilter).toBe('all');
    });
  });

  describe('setLoading', () => {
    it('应该设置加载状态为true', () => {
      act(() => {
        useDownloadStore.getState().setLoading(true);
      });

      const store = useDownloadStore.getState();
      expect(store.isLoading).toBe(true);
    });

    it('应该设置加载状态为false', () => {
      act(() => {
        useDownloadStore.getState().setLoading(true);
        useDownloadStore.getState().setLoading(false);
      });

      const store = useDownloadStore.getState();
      expect(store.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('应该设置错误信息', () => {
      const errorMessage = 'Network error';

      act(() => {
        useDownloadStore.getState().setError(errorMessage);
      });

      const store = useDownloadStore.getState();
      expect(store.error).toBe(errorMessage);
    });

    it('应该清除错误信息', () => {
      act(() => {
        useDownloadStore.getState().setError('Error');
        useDownloadStore.getState().setError(null);
      });

      const store = useDownloadStore.getState();
      expect(store.error).toBe(null);
    });
  });

  describe('状态组合操作', () => {
    it('应该支持连续操作', () => {
      act(() => {
        useDownloadStore.getState().setLoading(true);
        useDownloadStore.getState().addDownload(createMockDownload('1'));
        useDownloadStore.getState().updateDownload('1', { status: 'downloading' });
        useDownloadStore.getState().setLoading(false);
      });

      const store = useDownloadStore.getState();
      expect(store.isLoading).toBe(false);
      expect(store.downloads).toHaveLength(1);
      expect(store.downloads[0].status).toBe('downloading');
    });

    it('应该正确处理复杂场景', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1', 'pending'));
        useDownloadStore.getState().addDownload(createMockDownload('2', 'downloading'));
        useDownloadStore.getState().addDownload(createMockDownload('3', 'completed'));
        useDownloadStore.getState().addDownload(createMockDownload('4', 'error'));
      });

      act(() => {
        useDownloadStore.getState().updateDownload('2', { progress: 100, status: 'completed' });
        useDownloadStore.getState().removeDownload('4');
        useDownloadStore.getState().setStatusFilter('completed');
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toHaveLength(3);
      expect(store.downloads.filter(d => d.status === 'completed').length).toBe(2);
      expect(store.statusFilter).toBe('completed');
    });
  });

  describe('状态重置', () => {
    it('应该可以完全重置状态', () => {
      act(() => {
        useDownloadStore.getState().addDownload(createMockDownload('1'));
        useDownloadStore.getState().setLoading(true);
        useDownloadStore.getState().setError('Test error');
        useDownloadStore.getState().setStatusFilter('downloading');
      });

      act(() => {
        useDownloadStore.getState().setDownloads([]);
        useDownloadStore.getState().setLoading(false);
        useDownloadStore.getState().setError(null);
        useDownloadStore.getState().setStatusFilter('all');
      });

      const store = useDownloadStore.getState();
      expect(store.downloads).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.statusFilter).toBe('all');
    });
  });
});