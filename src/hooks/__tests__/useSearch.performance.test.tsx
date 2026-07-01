import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../../hooks/useSearch';
import { DownloadItem } from '../../types';

describe('Performance Tests', () => {
  const generateLargeDataset = (count: number): DownloadItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      url: `https://example.com/file-${i}.zip`,
      filename: `file-${i}.zip`,
      status: 'completed' as const,
      progress: 100,
      downloadedBytes: 1000000 + i,
      totalBytes: 1000000 + i,
      speed: 0,
      resumePosition: 0,
      createdAt: Date.now() - i * 1000,
      priority: 'normal' as const,
    }));
  };

  describe('useSearch Performance', () => {
    it('应该在1000条数据时快速过滤', () => {
      const largeData = generateLargeDataset(1000);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 0 }));

      const startTime = performance.now();
      act(() => {
        result.current.setKeyword('file-5');
      });
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
      expect(result.current.filteredData.length).toBeGreaterThan(0);
    });

    it('应该在5000条数据时快速过滤', () => {
      const largeData = generateLargeDataset(5000);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 0 }));

      const startTime = performance.now();
      act(() => {
        result.current.setKeyword('file-12');
      });
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
    });

    it('应该在10000条数据时快速过滤', () => {
      const largeData = generateLargeDataset(10000);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 0 }));

      const startTime = performance.now();
      act(() => {
        result.current.setKeyword('file-99');
      });
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(300);
    });

    it('应该正确计算匹配数量', () => {
      const largeData = generateLargeDataset(1000);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('file-');
      });

      expect(result.current.filteredCount).toBe(1000);
    });

    it('应该正确排序大量数据', () => {
      const largeData = generateLargeDataset(1000);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 0 }));

      const startTime = performance.now();
      act(() => {
        result.current.setFilters({ sortBy: 'created_at', sortOrder: 'desc' });
      });
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('应该快速处理空搜索', () => {
      const largeData = generateLargeDataset(10000);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 0 }));

      const startTime = performance.now();
      act(() => {
        result.current.setKeyword('');
      });
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(result.current.filteredData.length).toBe(10000);
    });
  });

  describe('useSearch Debounce', () => {
    it('应该正确应用防抖', async () => {
      jest.useFakeTimers();
      const largeData = generateLargeDataset(1000);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 300 }));

      const startTime = Date.now();
      
      act(() => {
        result.current.setKeyword('test');
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current.isSearching).toBe(true);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current.isSearching).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('Search History', () => {
    it('应该快速添加搜索历史', () => {
      const largeData = generateLargeDataset(100);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 0, maxHistory: 10 }));

      const startTime = performance.now();
      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.setKeyword(`search-${i}`);
        });
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
      expect(result.current.searchHistory).toHaveLength(10);
    });

    it('应该正确去重搜索历史', () => {
      const largeData = generateLargeDataset(100);
      
      const { result } = renderHook(() => useSearch(largeData, { debounceMs: 0, maxHistory: 10 }));

      act(() => {
        result.current.setKeyword('test');
      });
      act(() => {
        result.current.setKeyword('test');
      });
      act(() => {
        result.current.setKeyword('test');
      });

      expect(result.current.searchHistory.filter(h => h === 'test')).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('应该处理空数据集', () => {
      const { result } = renderHook(() => useSearch([], { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('test');
      });

      expect(result.current.filteredData).toEqual([]);
      expect(result.current.filteredCount).toBe(0);
    });

    it('应该处理特殊字符搜索', () => {
      const data = [
        { id: '1', url: 'https://example.com/file.zip', filename: 'file.zip', status: 'completed' as const, progress: 100, downloadedBytes: 1000, totalBytes: 1000, speed: 0, resumePosition: 0, createdAt: Date.now(), priority: 'normal' as const },
        { id: '2', url: 'https://example.com/file[1].zip', filename: 'file[1].zip', status: 'completed' as const, progress: 100, downloadedBytes: 1000, totalBytes: 1000, speed: 0, resumePosition: 0, createdAt: Date.now(), priority: 'normal' as const },
        { id: '3', url: 'https://example.com/file(2).zip', filename: 'file(2).zip', status: 'completed' as const, progress: 100, downloadedBytes: 1000, totalBytes: 1000, speed: 0, resumePosition: 0, createdAt: Date.now(), priority: 'normal' as const },
      ];

      const { result } = renderHook(() => useSearch(data, { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('file[1]');
      });

      expect(result.current.filteredData).toHaveLength(1);
    });

    it('应该处理无效正则表达式', () => {
      const data = generateLargeDataset(100);
      
      const { result } = renderHook(() => useSearch(data, { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('**invalid**');
      });

      expect(result.current.filteredData).toEqual([]);
    });
  });

  describe('Suggestions', () => {
    it('应该快速生成搜索建议', () => {
      const data = generateLargeDataset(1000);
      
      const { result } = renderHook(() => useSearch(data, { debounceMs: 0 }));

      const startTime = performance.now();
      act(() => {
        result.current.setKeyword('file-5');
      });
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(result.current.suggestions.length).toBeLessThanOrEqual(5);
    });
  });
});
