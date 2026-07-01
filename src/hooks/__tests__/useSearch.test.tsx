import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../useSearch';

interface TestData {
  id: string;
  filename: string;
  url: string;
  status: string;
  mime_type: string;
  created_at: string;
  file_size: number;
  category_id: number | null;
}

const mockData: TestData[] = [
  {
    id: '1',
    filename: 'video.mp4',
    url: 'https://example.com/video.mp4',
    status: 'completed',
    mime_type: 'video/mp4',
    created_at: '2024-01-15T10:00:00Z',
    file_size: 1000000,
    category_id: 1
  },
  {
    id: '2',
    filename: 'document.pdf',
    url: 'https://example.com/doc.pdf',
    status: 'completed',
    mime_type: 'application/pdf',
    created_at: '2024-01-14T09:00:00Z',
    file_size: 500000,
    category_id: 2
  },
  {
    id: '3',
    filename: 'image.jpg',
    url: 'https://example.com/image.jpg',
    status: 'downloading',
    mime_type: 'image/jpeg',
    created_at: '2024-01-13T08:00:00Z',
    file_size: 100000,
    category_id: 1
  },
  {
    id: '4',
    filename: 'music.mp3',
    url: 'https://example.com/music.mp3',
    status: 'paused',
    mime_type: 'audio/mpeg',
    created_at: '2024-01-12T07:00:00Z',
    file_size: 300000,
    category_id: 3
  },
  {
    id: '5',
    filename: 'archive.zip',
    url: 'https://example.com/archive.zip',
    status: 'completed',
    mime_type: 'application/zip',
    created_at: '2024-01-11T06:00:00Z',
    file_size: 2000000,
    category_id: 4
  }
];

describe('useSearch Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('初始化', () => {
    it('应该正确初始化默认值', () => {
      const { result } = renderHook(() => useSearch(mockData));

      expect(result.current.filters).toEqual({
        keyword: '',
        type: [],
        status: [],
        category: null,
        dateRange: { start: null, end: null },
        sortBy: 'created_at',
        sortOrder: 'desc',
        searchFields: ['filename', 'url'],
        regexEnabled: false,
        caseSensitive: false
      });
      expect(result.current.filteredData).toEqual(mockData);
      expect(result.current.totalCount).toBe(5);
      expect(result.current.filteredCount).toBe(5);
      expect(result.current.searchHistory).toEqual([]);
    });

    it('应该从localStorage加载搜索历史', () => {
      localStorage.setItem('searchHistory', JSON.stringify(['video', 'document']));
      
      const { result } = renderHook(() => useSearch(mockData));

      expect(result.current.searchHistory).toEqual(['video', 'document']);
    });

    it('应该正确处理localStorage解析错误', () => {
      localStorage.setItem('searchHistory', 'invalid json');
      
      const { result } = renderHook(() => useSearch(mockData));

      expect(result.current.searchHistory).toEqual([]);
    });
  });

  describe('搜索功能', () => {
    it('应该根据关键词过滤数据', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('video');
        jest.runAllTimers();
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].filename).toBe('video.mp4');

      jest.useRealTimers();
    });

    it('应该在多个字段中搜索', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('example.com');
        jest.runAllTimers();
      });

      expect(result.current.filteredData).toHaveLength(5);

      jest.useRealTimers();
    });

    it('应该支持正则表达式搜索', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ keyword: '^video', regexEnabled: true });
        jest.runAllTimers();
      });

      expect(result.current.filteredData).toHaveLength(1);

      jest.useRealTimers();
    });

    it('应该支持大小写敏感搜索', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ keyword: 'VIDEO', caseSensitive: true });
        jest.runAllTimers();
      });

      expect(result.current.filteredData).toHaveLength(0);

      jest.useRealTimers();
    });

    it('应该支持大小写不敏感搜索', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ keyword: 'VIDEO', caseSensitive: false });
        jest.runAllTimers();
      });

      expect(result.current.filteredData).toHaveLength(1);

      jest.useRealTimers();
    });

    it('应该正确处理无效的正则表达式', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ keyword: '[invalid', regexEnabled: true });
        jest.runAllTimers();
      });

      expect(result.current.filteredData).toHaveLength(0);

      jest.useRealTimers();
    });
  });

  describe('过滤功能', () => {
    it('应该根据文件类型过滤', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ type: ['video', 'image'] });
      });

      expect(result.current.filteredData).toHaveLength(2);
      expect(result.current.filteredData.some(d => d.mime_type.startsWith('video/'))).toBe(true);
      expect(result.current.filteredData.some(d => d.mime_type.startsWith('image/'))).toBe(true);
    });

    it('应该根据状态过滤', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ status: ['completed'] });
      });

      expect(result.current.filteredData).toHaveLength(3);
      expect(result.current.filteredData.every(d => d.status === 'completed')).toBe(true);
    });

    it('应该根据分类过滤', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ category: 1 });
      });

      expect(result.current.filteredData).toHaveLength(2);
      expect(result.current.filteredData.every(d => d.category_id === 1)).toBe(true);
    });

    it('应该根据日期范围过滤', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({
          dateRange: {
            start: '2024-01-13',
            end: '2024-01-15'
          }
        });
      });

      expect(result.current.filteredData).toHaveLength(3);
    });

    it('应该组合多个过滤条件', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({
          type: ['video', 'document'],
          status: ['completed']
        });
      });

      expect(result.current.filteredData).toHaveLength(2);
    });
  });

  describe('排序功能', () => {
    it('应该按创建时间排序', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ sortBy: 'created_at', sortOrder: 'asc' });
      });

      const dates = result.current.filteredData.map(d => d.created_at);
      expect(dates).toEqual(dates.slice().sort());
    });

    it('应该按文件大小排序', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ sortBy: 'file_size', sortOrder: 'desc' });
      });

      const sizes = result.current.filteredData.map(d => d.file_size);
      expect(sizes).toEqual([2000000, 1000000, 500000, 300000, 100000]);
    });

    it('应该按文件名排序', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ sortBy: 'original_name', sortOrder: 'asc' });
      });

      const names = result.current.filteredData.map(d => d.filename);
      expect(names).toEqual(['archive.zip', 'document.pdf', 'image.jpg', 'music.mp3', 'video.mp4']);
    });
  });

  describe('搜索历史', () => {
    it('应该添加搜索关键词到历史', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.addToHistory('test search');
      });

      expect(result.current.searchHistory).toEqual(['test search']);
    });

    it('应该避免重复添加相同的关键词', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.addToHistory('test');
        result.current.addToHistory('test');
      });

      expect(result.current.searchHistory).toEqual(['test']);
    });

    it('应该限制历史记录数量', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0, maxHistory: 3 }));

      act(() => {
        result.current.addToHistory('a');
        result.current.addToHistory('b');
        result.current.addToHistory('c');
        result.current.addToHistory('d');
      });

      expect(result.current.searchHistory).toHaveLength(3);
      expect(result.current.searchHistory).toEqual(['d', 'c', 'b']);
    });

    it('应该从历史中移除关键词', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.addToHistory('a');
        result.current.addToHistory('b');
        result.current.addToHistory('c');
        result.current.removeFromHistory('b');
      });

      expect(result.current.searchHistory).toEqual(['c', 'a']);
    });

    it('应该清空搜索历史', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.addToHistory('a');
        result.current.addToHistory('b');
        result.current.clearHistory();
      });

      expect(result.current.searchHistory).toEqual([]);
    });

    it('应该将历史保存到localStorage', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0, storageKey: 'testKey' }));

      act(() => {
        result.current.addToHistory('saved');
      });

      const saved = localStorage.getItem('testKey');
      expect(saved).toBe(JSON.stringify(['saved']));
    });
  });

  describe('其他功能', () => {
    it('应该高亮匹配的文本', () => {
      const { result } = renderHook(() => useSearch(mockData));

      const highlighted = result.current.highlightMatch('This is a video', 'video');
      expect(highlighted).toBe('This is a <mark class="search-highlight">video</mark>');
    });

    it('应该正确处理空关键词', () => {
      const { result } = renderHook(() => useSearch(mockData));

      const highlighted = result.current.highlightMatch('test text', '');
      expect(highlighted).toBe('test text');
    });

    it('应该重置所有过滤条件', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setFilters({ keyword: 'test', type: ['video'] });
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters).toEqual({
        keyword: '',
        type: [],
        status: [],
        category: null,
        dateRange: { start: null, end: null },
        sortBy: 'created_at',
        sortOrder: 'desc',
        searchFields: ['filename', 'url'],
        regexEnabled: false,
        caseSensitive: false
      });
      expect(result.current.filteredData).toHaveLength(5);
    });

    it('应该清除搜索关键词', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('test');
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.filters.keyword).toBe('');
      expect(result.current.filteredData).toHaveLength(5);
    });

    it('应该正确显示搜索状态', () => {
      const { result } = renderHook(() => useSearch(mockData));

      act(() => {
        result.current.setKeyword('test');
      });

      expect(result.current.isSearching).toBe(true);
    });
  });

  describe('性能优化', () => {
    it('应该使用防抖减少搜索次数', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 100 }));

      act(() => {
        result.current.setKeyword('a');
        result.current.setKeyword('ab');
        result.current.setKeyword('abc');
      });

      expect(result.current.filteredData).toHaveLength(5);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.filteredData).toHaveLength(0);

      jest.useRealTimers();
    });

    it('应该正确计算匹配数量', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('video');
        jest.runAllTimers();
      });

      expect(result.current.matches).toHaveLength(1);
      expect(result.current.matches[0].field).toBe('filename');
      expect(result.current.matches[0].match).toBe('video');

      jest.useRealTimers();
    });
  });

  describe('边界情况', () => {
    it('应该处理空数据', () => {
      const { result } = renderHook(() => useSearch([]));

      expect(result.current.filteredData).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.filteredCount).toBe(0);
    });

    it('应该处理数据变化', () => {
      const { result, rerender } = renderHook((data) => useSearch(data, { debounceMs: 0 }), {
        initialProps: mockData
      });

      expect(result.current.filteredData).toHaveLength(5);

      const newData = [...mockData, {
        id: '6',
        filename: 'new-file.txt',
        url: 'https://example.com/new.txt',
        status: 'completed',
        mime_type: 'text/plain',
        created_at: '2024-01-16T00:00:00Z',
        file_size: 1000,
        category_id: 2
      }];

      rerender(newData);

      expect(result.current.filteredData).toHaveLength(6);
      expect(result.current.totalCount).toBe(6);
    });

    it('应该正确处理空字符串搜索', () => {
      const { result } = renderHook(() => useSearch(mockData, { debounceMs: 0 }));

      act(() => {
        result.current.setKeyword('');
      });

      expect(result.current.filteredData).toHaveLength(5);
    });
  });
});
