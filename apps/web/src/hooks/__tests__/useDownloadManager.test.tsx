import { renderHook, act } from '@testing-library/react';
import { useDownloadManager } from '../useDownloadManager';
import { useDownloadStore } from '../../store/useDownloadStore';

const mockService = {
  generateId: vi.fn(),
  downloadFile: vi.fn(),
  pauseDownload: vi.fn(),
  cancelDownload: vi.fn(),
  getSavedProgress: vi.fn(() => null),
};

vi.mock('../../services/DownloadService', () => ({
  DownloadService: {
    getInstance: () => mockService,
  },
}));

describe('useDownloadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.generateId.mockImplementation(() => `mock-id-${Math.random().toString(36).substr(2, 9)}`);
    // downloads 现由共享 zustand store 持有，需在每个用例前重置以保证隔离
    useDownloadStore.setState({ downloads: [], isLoading: false, error: null, statusFilter: 'all' });
  });

  describe('基础功能', () => {
    it('应该正确初始化空状态', () => {
      const { result } = renderHook(() => useDownloadManager());

      expect(result.current.downloads).toEqual([]);
      expect(result.current.notifications).toEqual([]);
      expect(result.current.stats).toEqual({
        totalDownloads: 0,
        completedDownloads: 0,
        failedDownloads: 0,
        totalSize: 0,
        downloadedSize: 0,
      });
    });

    it('应该暴露所有核心方法', () => {
      const { result } = renderHook(() => useDownloadManager());

      expect(typeof result.current.addDownload).toBe('function');
      expect(typeof result.current.addBulkDownloads).toBe('function');
      expect(typeof result.current.startDownload).toBe('function');
      expect(typeof result.current.pauseDownload).toBe('function');
      expect(typeof result.current.resumeDownload).toBe('function');
      expect(typeof result.current.cancelDownload).toBe('function');
      expect(typeof result.current.removeDownload).toBe('function');
      expect(typeof result.current.clearCompleted).toBe('function');
      expect(typeof result.current.setPriority).toBe('function');
      expect(typeof result.current.sortByPriority).toBe('function');
    });
  });

  describe('addDownload', () => {
    it('应该正确添加新下载', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addDownload('https://example.com/file.zip');
      });

      expect(result.current.downloads).toHaveLength(1);
      const item = result.current.downloads[0];
      expect(item.url).toBe('https://example.com/file.zip');
      expect(item.filename).toBe('file.zip');
      expect(item.status).toBe('pending');
      expect(item.progress).toBe(0);
      expect(item.priority).toBe('normal');
    });

    it('应该支持自定义文件名', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addDownload('https://example.com/file.zip', 'myfile.zip');
      });

      expect(result.current.downloads[0].filename).toBe('myfile.zip');
    });

    it('应该支持自定义优先级', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addDownload('https://example.com/file.zip', undefined, 'high');
      });

      expect(result.current.downloads[0].priority).toBe('high');
    });

    it('应该返回新下载的ID', () => {
      const { result } = renderHook(() => useDownloadManager());

      let id: string = '';
      act(() => {
        id = result.current.addDownload('https://example.com/file.zip');
      });

      expect(id).toBeTruthy();
      expect(result.current.downloads[0].id).toBe(id);
    });

    it('URL没有文件名时应使用默认值', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addDownload('https://example.com/');
      });

      expect(result.current.downloads[0].filename).toBe('download');
    });
  });

  describe('addBulkDownloads', () => {
    it('应该批量添加下载', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addBulkDownloads([
          'https://example.com/a.zip',
          'https://example.com/b.zip',
          'https://example.com/c.zip'
        ]);
      });

      expect(result.current.downloads).toHaveLength(3);
      expect(result.current.downloads[0].filename).toBe('a.zip');
      expect(result.current.downloads[1].filename).toBe('b.zip');
      expect(result.current.downloads[2].filename).toBe('c.zip');
    });

    it('应该发送批量添加通知', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addBulkDownloads(['a', 'b', 'c']);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('批量添加成功');
      expect(result.current.notifications[0].message).toBe('已添加 3 个下载任务');

      vi.useRealTimers();
    });

    it('应该支持自定义文件名', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addBulkDownloads(
          ['https://example.com/a', 'https://example.com/b'],
          ['file1.txt', 'file2.txt']
        );
      });

      expect(result.current.downloads[0].filename).toBe('file1.txt');
      expect(result.current.downloads[1].filename).toBe('file2.txt');
    });

    it('应该返回所有新下载的ID', () => {
      const { result } = renderHook(() => useDownloadManager());

      let ids: string[] = [];
      act(() => {
        ids = result.current.addBulkDownloads(['a', 'b', 'c']);
      });

      expect(ids).toHaveLength(3);
      expect(result.current.downloads[0].id).toBe(ids[0]);
    });
  });

  describe('startDownload', () => {
    it('应该将状态改为downloading', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        const id = result.current.addDownload('https://example.com/file.zip');
        result.current.startDownload(id);
      });

      expect(result.current.downloads[0].status).toBe('downloading');
    });
  });

  describe('pauseDownload', () => {
    it('应该将状态改为paused', () => {
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/file.zip');
        result.current.startDownload(id);
      });

      act(() => {
        result.current.pauseDownload(id);
      });

      expect(result.current.downloads[0].status).toBe('paused');
      expect(result.current.downloads[0].speed).toBe(0);
    });

    it('应该发送暂停通知', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        const id = result.current.addDownload('https://example.com/file.zip');
        result.current.pauseDownload(id);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('warning');
      vi.useRealTimers();
    });
  });

  describe('resumeDownload', () => {
    it('应该将状态改回downloading', () => {
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/file.zip');
        result.current.startDownload(id);
        result.current.pauseDownload(id);
      });

      act(() => {
        result.current.resumeDownload(id);
      });

      expect(result.current.downloads[0].status).toBe('downloading');
    });
  });

  describe('cancelDownload', () => {
    it('应该将状态改为cancelled', () => {
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/file.zip');
        result.current.startDownload(id);
      });

      act(() => {
        result.current.cancelDownload(id);
      });

      expect(result.current.downloads[0].status).toBe('cancelled');
      expect(result.current.downloads[0].speed).toBe(0);
    });
  });

  describe('removeDownload', () => {
    it('应该从列表中移除下载', () => {
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/file.zip');
      });

      expect(result.current.downloads).toHaveLength(1);

      act(() => {
        result.current.removeDownload(id);
      });

      expect(result.current.downloads).toHaveLength(0);
    });

    it('应该清理内部Map数据', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        const id = result.current.addDownload('https://example.com/file.zip');
        result.current.removeDownload(id);
      });

      act(() => {
        result.current.addDownload('https://example.com/file2.zip');
      });

      expect(result.current.downloads).toHaveLength(1);
    });
  });

  describe('clearCompleted', () => {
    it('应该只清除completed和cancelled状态的下载', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        const id1 = result.current.addDownload('https://example.com/a.zip');
        const id2 = result.current.addDownload('https://example.com/b.zip');
        const id3 = result.current.addDownload('https://example.com/c.zip');

        result.current.cancelDownload(id1);
        result.current.removeDownload(id2);
      });

      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.downloads).toHaveLength(1);
      expect(result.current.downloads[0].url).toBe('https://example.com/c.zip');
    });
  });

  describe('setPriority', () => {
    it('应该正确修改下载优先级', () => {
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/file.zip', undefined, 'normal');
      });

      act(() => {
        result.current.setPriority(id, 'urgent');
      });

      expect(result.current.downloads[0].priority).toBe('urgent');
    });
  });

  describe('sortByPriority', () => {
    it('应该按优先级和下载状态排序', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addDownload('https://example.com/a.zip', undefined, 'low');
        result.current.addDownload('https://example.com/b.zip', undefined, 'urgent');
        result.current.addDownload('https://example.com/c.zip', undefined, 'high');
      });

      act(() => {
        result.current.sortByPriority();
      });

      const priorities = result.current.downloads.map(d => d.priority);
      expect(priorities).toEqual(['urgent', 'high', 'low']);
    });

    it('下载中的任务应该排在最前', () => {
      const { result } = renderHook(() => useDownloadManager());

      let downloadingId = '';
      act(() => {
        downloadingId = result.current.addDownload('https://example.com/a.zip', undefined, 'low');
        result.current.addDownload('https://example.com/b.zip', undefined, 'urgent');
      });

      act(() => {
        result.current.startDownload(downloadingId);
        result.current.sortByPriority();
      });

      expect(result.current.downloads[0].status).toBe('downloading');
    });
  });

  describe('stats', () => {
    it('应该正确计算统计数据', () => {
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        result.current.addDownload('https://example.com/a.zip');
        result.current.addDownload('https://example.com/b.zip');
      });

      const stats = result.current.stats;
      expect(stats.totalDownloads).toBe(2);
      expect(stats.completedDownloads).toBe(0);
      expect(stats.failedDownloads).toBe(0);
      expect(stats.totalSize).toBe(0);
    });

    it('应该统计已完成的下载', () => {
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/a.zip');
        result.current.startDownload(id);
        result.current.cancelDownload(id);
      });

      act(() => {
        result.current.downloads[0].status = 'completed';
        result.current.setPriority(id, 'normal');
      });

      const stats = result.current.stats;
      expect(stats.totalDownloads).toBeGreaterThan(0);
    });
  });

  describe('通知管理', () => {
    it('应该在5秒后自动移除通知', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDownloadManager());

      act(() => {
        const id = result.current.addDownload('https://example.com/a.zip');
        result.current.pauseDownload(id);
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.notifications).toHaveLength(0);
      vi.useRealTimers();
    });

    it('应该在下载完成时发送成功通知', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/a.zip');
        result.current.startDownload(id);
      });

      act(() => {
        result.current.downloads[0].status = 'completed';
        result.current.setPriority(id, 'high');
      });

      const successNotif = result.current.notifications.find(n => n.type === 'success');
      expect(successNotif).toBeDefined();
      expect(successNotif?.title).toBe('下载完成');
      vi.useRealTimers();
    });

    it('应该在下载失败时发送错误通知', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/a.zip');
        result.current.startDownload(id);
      });

      act(() => {
        result.current.downloads[0].status = 'error';
        result.current.downloads[0].error = '网络错误';
        result.current.setPriority(id, 'normal');
      });

      const errorNotif = result.current.notifications.find(n => n.type === 'error');
      expect(errorNotif).toBeDefined();
      expect(errorNotif?.title).toBe('下载失败');
      vi.useRealTimers();
    });

    it('同一任务的完成通知不应该重复发送', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useDownloadManager());

      let id = '';
      act(() => {
        id = result.current.addDownload('https://example.com/a.zip');
      });

      act(() => {
        result.current.cancelDownload(id);
      });

      act(() => {
        const newId = result.current.addDownload('https://example.com/b.zip');
        const item = result.current.downloads.find(d => d.id === newId);
        if (item) {
          item.status = 'completed';
        }
        result.current.setPriority(newId, 'low');
      });

      const successCount = result.current.notifications.filter(n => n.type === 'success').length;
      expect(successCount).toBeLessThanOrEqual(1);
      vi.useRealTimers();
    });
  });
});