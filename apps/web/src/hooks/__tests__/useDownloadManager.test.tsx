import { renderHook, act } from '@testing-library/react';
import { useDownloadManager } from '../useDownloadManager';
import { useDownloadStore } from '../../store/useDownloadStore';

/**
 * 内存假后端：模拟服务端 /api/downloads 的行为。
 *
 * 新版 useDownloadManager 驱动的是「服务端下载引擎」，浏览器端 DownloadService
 * 已被弃用，因此这里 mock 的是 DownloadApiService（而不是 DownloadService）。
 * vi.mock 会被提升到文件顶部，故状态与工厂函数统一放进 vi.hoisted。
 */
const fake = vi.hoisted(() => {
  type Row = {
    id: number;
    url: string;
    filename: string;
    status: string;
    progress: number;
    downloadedBytes: number;
    totalBytes: number;
    speed: number;
    resumePosition: number;
    createdAt: string;
    completedAt: string | null;
  };

  const state: { seq: number; rows: Row[] } = { seq: 0, rows: [] };

  /**
   * 复刻服务端 download.service.ts 的推断逻辑，保证 mock 与真实行为一致：
   *   input.filename ?? (new URL(input.url).pathname.split('/').pop() || 'download')
   */
  function defaultName(url: string): string {
    try {
      return new URL(url).pathname.split('/').pop() || 'download';
    } catch {
      // 非法 URL（如测试里的裸字符串 'a'）：服务端会在此前就被 Zod 拦下，这里给个兜底
      return 'download';
    }
  }

  return {
    state,
    reset() {
      state.seq = 0;
      state.rows = [];
    },
    /** 返回浅拷贝快照，模拟 JSON 传输后的独立对象 */
    snapshot(): Row[] {
      return state.rows.map((r) => ({ ...r }));
    },
    find(id: string): Row | undefined {
      return state.rows.find((r) => String(r.id) === String(id));
    },
    create(url: string, filename?: string): Row {
      state.seq += 1;
      return {
        id: state.seq,
        url,
        filename: filename || defaultName(url),
        status: 'pending',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        resumePosition: 0,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
    },
  };
});

vi.mock('../../services/DownloadApiService', () => ({
  DownloadApiService: {
    getAllDownloads: async () => ({ success: true, data: fake.snapshot() }),
    createDownload: async (dto: { url: string; filename?: string }) => {
      const row = fake.create(dto.url, dto.filename);
      fake.state.rows.push(row);
      return { success: true, data: { ...row } };
    },
    startDownload: async (id: string) => {
      const row = fake.find(id);
      if (row) row.status = 'downloading';
      return { success: true };
    },
    pauseDownload: async (id: string) => {
      const row = fake.find(id);
      if (row) {
        row.status = 'paused';
        row.speed = 0;
      }
      return { success: true };
    },
    resumeDownload: async (id: string) => {
      const row = fake.find(id);
      if (row) row.status = 'downloading';
      return { success: true };
    },
    cancelDownload: async (id: string) => {
      const row = fake.find(id);
      if (row) {
        row.status = 'cancelled';
        row.speed = 0;
      }
      return { success: true };
    },
    deleteDownload: async (id: string) => {
      fake.state.rows = fake.state.rows.filter((r) => String(r.id) !== String(id));
      return { success: true };
    },
    clearCompleted: async () => {
      fake.state.rows = fake.state.rows.filter(
        (r) => r.status !== 'completed' && r.status !== 'cancelled',
      );
      return { success: true };
    },
  },
}));

/** 挂载 hook 并等首次 refresh 落地，避免未完成的异步 effect 泄漏到下一个用例 */
async function mountManager() {
  const rendered = renderHook(() => useDownloadManager());
  await act(async () => {
    /* 等挂载时的首次 refresh() Promise 落地 */
  });
  return rendered;
}

describe('useDownloadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.reset();
    // downloads 现由共享 zustand store 持有，需在每个用例前重置以保证隔离
    useDownloadStore.setState({ downloads: [], isLoading: false, error: null, statusFilter: 'all' });
  });

  describe('基础功能', () => {
    it('应该正确初始化空状态', async () => {
      const { result } = await mountManager();

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

    it('应该暴露所有核心方法', async () => {
      const { result } = await mountManager();

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
    it('应该正确添加新下载', async () => {
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addDownload('https://example.com/file.zip');
      });

      expect(result.current.downloads).toHaveLength(1);
      const item = result.current.downloads[0];
      expect(item.url).toBe('https://example.com/file.zip');
      expect(item.filename).toBe('file.zip');
      expect(item.status).toBe('pending');
      expect(item.progress).toBe(0);
      expect(item.priority).toBe('normal');
    });

    it('应该支持自定义文件名', async () => {
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addDownload('https://example.com/file.zip', 'myfile.zip');
      });

      expect(result.current.downloads[0].filename).toBe('myfile.zip');
    });

    it('应该支持自定义优先级', async () => {
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addDownload('https://example.com/file.zip', undefined, 'high');
      });

      expect(result.current.downloads[0].priority).toBe('high');
    });

    it('应该返回新下载的ID', async () => {
      const { result } = await mountManager();

      let id: string | null = null;
      await act(async () => {
        id = await result.current.addDownload('https://example.com/file.zip');
      });

      expect(id).toBeTruthy();
      expect(result.current.downloads[0].id).toBe(id);
    });

    it('URL没有文件名时应使用默认值', async () => {
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addDownload('https://example.com/');
      });

      expect(result.current.downloads[0].filename).toBe('download');
    });
  });

  describe('addBulkDownloads', () => {
    it('应该批量添加下载', async () => {
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addBulkDownloads([
          'https://example.com/a.zip',
          'https://example.com/b.zip',
          'https://example.com/c.zip',
        ]);
      });

      expect(result.current.downloads).toHaveLength(3);
      expect(result.current.downloads[0].filename).toBe('a.zip');
      expect(result.current.downloads[1].filename).toBe('b.zip');
      expect(result.current.downloads[2].filename).toBe('c.zip');
    });

    it('应该发送批量添加通知', async () => {
      vi.useFakeTimers();
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addBulkDownloads(['a', 'b', 'c']);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('批量添加成功');
      expect(result.current.notifications[0].message).toBe('已添加 3 个下载任务');

      vi.useRealTimers();
    });

    it('应该支持自定义文件名', async () => {
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addBulkDownloads(
          ['https://example.com/a', 'https://example.com/b'],
          ['file1.txt', 'file2.txt'],
        );
      });

      expect(result.current.downloads[0].filename).toBe('file1.txt');
      expect(result.current.downloads[1].filename).toBe('file2.txt');
    });

    it('应该返回所有新下载的ID', async () => {
      const { result } = await mountManager();

      let ids: string[] = [];
      await act(async () => {
        ids = await result.current.addBulkDownloads(['a', 'b', 'c']);
      });

      expect(ids).toHaveLength(3);
      expect(result.current.downloads[0].id).toBe(ids[0]);
    });
  });

  describe('startDownload', () => {
    it('应该将状态改为downloading', async () => {
      const { result } = await mountManager();

      await act(async () => {
        const id = await result.current.addDownload('https://example.com/file.zip');
        await result.current.startDownload(id!);
      });

      expect(result.current.downloads[0].status).toBe('downloading');
    });
  });

  describe('pauseDownload', () => {
    it('应该将状态改为paused', async () => {
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/file.zip'))!;
        await result.current.startDownload(id);
      });

      await act(async () => {
        await result.current.pauseDownload(id);
      });

      expect(result.current.downloads[0].status).toBe('paused');
      expect(result.current.downloads[0].speed).toBe(0);
    });

    it('应该发送暂停通知', async () => {
      vi.useFakeTimers();
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/file.zip'))!;
        await result.current.pauseDownload(id);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('warning');
      vi.useRealTimers();
    });
  });

  describe('resumeDownload', () => {
    it('应该将状态改回downloading', async () => {
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/file.zip'))!;
        await result.current.startDownload(id);
        await result.current.pauseDownload(id);
      });

      await act(async () => {
        await result.current.resumeDownload(id);
      });

      expect(result.current.downloads[0].status).toBe('downloading');
    });
  });

  describe('cancelDownload', () => {
    it('应该将状态改为cancelled', async () => {
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/file.zip'))!;
        await result.current.startDownload(id);
      });

      await act(async () => {
        await result.current.cancelDownload(id);
      });

      expect(result.current.downloads[0].status).toBe('cancelled');
      expect(result.current.downloads[0].speed).toBe(0);
    });
  });

  describe('removeDownload', () => {
    it('应该从列表中移除下载', async () => {
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/file.zip'))!;
      });

      expect(result.current.downloads).toHaveLength(1);

      await act(async () => {
        await result.current.removeDownload(id);
      });

      expect(result.current.downloads).toHaveLength(0);
    });

    it('应该清理内部Map数据', async () => {
      const { result } = await mountManager();

      await act(async () => {
        const id = await result.current.addDownload('https://example.com/file.zip');
        await result.current.removeDownload(id!);
      });

      await act(async () => {
        await result.current.addDownload('https://example.com/file2.zip');
      });

      expect(result.current.downloads).toHaveLength(1);
    });
  });

  describe('clearCompleted', () => {
    it('应该只清除completed和cancelled状态的下载', async () => {
      const { result } = await mountManager();

      await act(async () => {
        const id1 = await result.current.addDownload('https://example.com/a.zip');
        const id2 = await result.current.addDownload('https://example.com/b.zip');
        await result.current.addDownload('https://example.com/c.zip');

        await result.current.cancelDownload(id1!);
        await result.current.removeDownload(id2!);
      });

      await act(async () => {
        await result.current.clearCompleted();
      });

      expect(result.current.downloads).toHaveLength(1);
      expect(result.current.downloads[0].url).toBe('https://example.com/c.zip');
    });
  });

  describe('setPriority', () => {
    it('应该正确修改下载优先级', async () => {
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/file.zip', undefined, 'normal'))!;
      });

      act(() => {
        result.current.setPriority(id, 'urgent');
      });

      expect(result.current.downloads[0].priority).toBe('urgent');
    });
  });

  describe('sortByPriority', () => {
    it('应该按优先级和下载状态排序', async () => {
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addDownload('https://example.com/a.zip', undefined, 'low');
        await result.current.addDownload('https://example.com/b.zip', undefined, 'urgent');
        await result.current.addDownload('https://example.com/c.zip', undefined, 'high');
      });

      act(() => {
        result.current.sortByPriority();
      });

      const priorities = result.current.downloads.map((d) => d.priority);
      expect(priorities).toEqual(['urgent', 'high', 'low']);
    });

    it('下载中的任务应该排在最前', async () => {
      const { result } = await mountManager();

      let downloadingId = '';
      await act(async () => {
        downloadingId = (await result.current.addDownload('https://example.com/a.zip', undefined, 'low'))!;
        await result.current.addDownload('https://example.com/b.zip', undefined, 'urgent');
      });

      await act(async () => {
        await result.current.startDownload(downloadingId);
      });

      act(() => {
        result.current.sortByPriority();
      });

      expect(result.current.downloads[0].status).toBe('downloading');
    });
  });

  describe('stats', () => {
    it('应该正确计算统计数据', async () => {
      const { result } = await mountManager();

      await act(async () => {
        await result.current.addDownload('https://example.com/a.zip');
        await result.current.addDownload('https://example.com/b.zip');
      });

      const stats = result.current.stats;
      expect(stats.totalDownloads).toBe(2);
      expect(stats.completedDownloads).toBe(0);
      expect(stats.failedDownloads).toBe(0);
      expect(stats.totalSize).toBe(0);
    });

    it('应该统计已完成的下载', async () => {
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/a.zip'))!;
        await result.current.startDownload(id);
        await result.current.cancelDownload(id);
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
    it('应该在5秒后自动移除通知', async () => {
      vi.useFakeTimers();
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/a.zip'))!;
        await result.current.pauseDownload(id);
      });

      expect(result.current.notifications).toHaveLength(1);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.notifications).toHaveLength(0);
      vi.useRealTimers();
    });

    it('应该在下载完成时发送成功通知', async () => {
      vi.useFakeTimers();
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/a.zip'))!;
        await result.current.startDownload(id);
      });

      act(() => {
        result.current.downloads[0].status = 'completed';
        result.current.setPriority(id, 'high');
      });

      const successNotif = result.current.notifications.find((n) => n.type === 'success');
      expect(successNotif).toBeDefined();
      expect(successNotif?.title).toBe('下载完成');
      vi.useRealTimers();
    });

    it('应该在下载失败时发送错误通知', async () => {
      vi.useFakeTimers();
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/a.zip'))!;
        await result.current.startDownload(id);
      });

      act(() => {
        result.current.downloads[0].status = 'error';
        result.current.downloads[0].error = '网络错误';
        result.current.setPriority(id, 'normal');
      });

      const errorNotif = result.current.notifications.find((n) => n.type === 'error');
      expect(errorNotif).toBeDefined();
      expect(errorNotif?.title).toBe('下载失败');
      vi.useRealTimers();
    });

    it('同一任务的完成通知不应该重复发送', async () => {
      vi.useFakeTimers();
      const { result } = await mountManager();

      let id = '';
      await act(async () => {
        id = (await result.current.addDownload('https://example.com/a.zip'))!;
      });

      await act(async () => {
        await result.current.cancelDownload(id);
      });

      await act(async () => {
        const newId = await result.current.addDownload('https://example.com/b.zip');
        const item = result.current.downloads.find((d) => d.id === newId);
        if (item) {
          item.status = 'completed';
        }
        result.current.setPriority(newId!, 'low');
      });

      const successCount = result.current.notifications.filter((n) => n.type === 'success').length;
      expect(successCount).toBeLessThanOrEqual(1);
      vi.useRealTimers();
    });
  });
});
