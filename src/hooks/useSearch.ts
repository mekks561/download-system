import { useState, useEffect, useMemo, useCallback } from 'react';

export interface SearchFilters {
  keyword: string;
  type: string[];
  status: string[];
  category: number | null;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  sortBy: 'created_at' | 'file_size' | 'original_name';
  sortOrder: 'asc' | 'desc';
  searchFields: ('filename' | 'url')[];
  regexEnabled: boolean;
  caseSensitive: boolean;
}

export interface UseSearchOptions {
  debounceMs?: number;
  maxHistory?: number;
  storageKey?: string;
  maxSuggestions?: number;
  presetsStorageKey?: string;
  syncWithUrl?: boolean;
}

export interface SearchSuggestion {
  type: 'history' | 'preset' | 'filename' | 'url' | 'field';
  value: string;
  display: string;
  icon: string;
  metadata?: Record<string, unknown>;
}

export interface SearchPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: number;
  usageCount: number;
}

export interface UseSearchReturn<T> {
  filters: SearchFilters;
  filteredData: T[];
  isSearching: boolean;
  searchHistory: string[];
  totalCount: number;
  filteredCount: number;
  matches: SearchMatch[];
  suggestions: SearchSuggestion[];
  presets: SearchPreset[];
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  clearSearch: () => void;
  setKeyword: (keyword: string) => void;
  addToHistory: (keyword: string) => void;
  clearHistory: () => void;
  removeFromHistory: (keyword: string) => void;
  highlightMatch: (text: string, keyword: string) => string;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  applyPresetFilters: (filters: SearchFilters) => void;
  exportResults: (format: 'json' | 'csv') => string;
  parseQuery: (query: string) => SearchFilters;
  buildShareUrl: () => string;
}

export interface SearchMatch {
  id: string | number;
  field: string;
  value: string;
  match: string;
}

const defaultFilters: SearchFilters = {
  keyword: '',
  type: [],
  status: [],
  category: null,
  dateRange: {
    start: null,
    end: null
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
  searchFields: ['filename', 'url'],
  regexEnabled: false,
  caseSensitive: false
};

export function useSearch<T>(
  data: T[],
  options: UseSearchOptions = {}
): UseSearchReturn<T> {
  const {
    debounceMs = 300,
    maxHistory = 10,
    storageKey = 'searchHistory',
    maxSuggestions = 8,
    presetsStorageKey = 'searchPresets',
    syncWithUrl = false
  } = options;

  const [filters, setFiltersState] = useState<SearchFilters>(defaultFilters);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [presets, setPresets] = useState<SearchPreset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // 防抖后的关键词 - 通过 useReducer 触发同步更新，确保 useMemo 能立即重算
  const [debouncedKeyword, setDebouncedKeyword] = useState(filters.keyword);

  // 初始化时从 localStorage / URL 加载
  useEffect(() => {
    // 加载搜索历史
    const savedHistory = localStorage.getItem(storageKey);
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }

    // 加载预设
    const savedPresets = localStorage.getItem(presetsStorageKey);
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (error) {
        console.error('Failed to parse search presets:', error);
      }
    }

    // 从 URL 同步
    if (syncWithUrl) {
      const params = new URLSearchParams(window.location.search);
      const keyword = params.get('q') || '';
      const type = params.get('type')?.split(',').filter(Boolean) || [];
      const status = params.get('status')?.split(',').filter(Boolean) || [];
      const category = params.get('category');
      const start = params.get('start');
      const end = params.get('end');
      const sortBy = params.get('sort') as SearchFilters['sortBy'] | null;
      const sortOrder = params.get('order') as SearchFilters['sortOrder'] | null;
      const regexEnabled = params.get('regex') === '1';
      const caseSensitive = params.get('case') === '1';

      if (keyword || type.length || status.length || category || start || end || sortBy) {
        setFiltersState({
          keyword,
          type: type as SearchFilters['type'],
          status: status as SearchFilters['status'],
          category: category ? Number(category) : null,
          dateRange: { start, end },
          sortBy: sortBy || defaultFilters.sortBy,
          sortOrder: sortOrder || defaultFilters.sortOrder,
          searchFields: defaultFilters.searchFields,
          regexEnabled,
          caseSensitive
        });
      }
    }
  }, [storageKey, presetsStorageKey, syncWithUrl]);

  // URL 同步
  useEffect(() => {
    if (!syncWithUrl) return;
    const params = new URLSearchParams();
    if (filters.keyword) params.set('q', filters.keyword);
    if (filters.type.length) params.set('type', filters.type.join(','));
    if (filters.status.length) params.set('status', filters.status.join(','));
    if (filters.category !== null) params.set('category', String(filters.category));
    if (filters.dateRange.start) params.set('start', filters.dateRange.start);
    if (filters.dateRange.end) params.set('end', filters.dateRange.end);
    if (filters.sortBy !== defaultFilters.sortBy) params.set('sort', filters.sortBy);
    if (filters.sortOrder !== defaultFilters.sortOrder) params.set('order', filters.sortOrder);
    if (filters.regexEnabled) params.set('regex', '1');
    if (filters.caseSensitive) params.set('case', '1');

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [filters, syncWithUrl]);

  useEffect(() => {
    if (debounceMs <= 0) {
      // 0 防抖模式下立即同步更新
      setDebouncedKeyword(filters.keyword);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedKeyword(filters.keyword);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters.keyword, debounceMs]);

  useEffect(() => {
    if (debouncedKeyword) {
      addToHistory(debouncedKeyword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword]);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters, debounceMs]);

  const setFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const clearSearch = useCallback(() => {
    setFiltersState(prev => ({ ...prev, keyword: '' }));
  }, []);

  const setKeyword = useCallback((keyword: string) => {
    setFiltersState(prev => ({ ...prev, keyword }));
  }, []);

  const addToHistory = useCallback((keyword: string) => {
    if (!keyword.trim()) return;

    setSearchHistory(prev => {
      const filtered = prev.filter(k => k !== keyword);
      const newHistory = [keyword, ...filtered].slice(0, maxHistory);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [maxHistory, storageKey]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const removeFromHistory = useCallback((keyword: string) => {
    setSearchHistory(prev => {
      const newHistory = prev.filter(k => k !== keyword);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [storageKey]);

  // 预设管理
  const savePreset = useCallback((name: string) => {
    setPresets(prev => {
      const newPreset: SearchPreset = {
        id: Date.now().toString(),
        name: name.trim() || `预设 ${prev.length + 1}`,
        filters: { ...filters },
        createdAt: Date.now(),
        usageCount: 0
      };
      const newPresets = [newPreset, ...prev].slice(0, 20);
      localStorage.setItem(presetsStorageKey, JSON.stringify(newPresets));
      return newPresets;
    });
  }, [filters, presetsStorageKey]);

  const loadPreset = useCallback((id: string) => {
    setPresets(prev => {
      const target = prev.find(p => p.id === id);
      if (!target) return prev;
      // 应用预设的筛选条件
      setFiltersState(target.filters);
      // 增加使用次数
      const updated = prev.map(p => p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p);
      localStorage.setItem(presetsStorageKey, JSON.stringify(updated));
      return updated;
    });
  }, [presetsStorageKey]);

  const deletePreset = useCallback((id: string) => {
    setPresets(prev => {
      const newPresets = prev.filter(p => p.id !== id);
      localStorage.setItem(presetsStorageKey, JSON.stringify(newPresets));
      return newPresets;
    });
  }, [presetsStorageKey]);

  const applyPresetFilters = useCallback((presetFilters: SearchFilters) => {
    setFiltersState(presetFilters);
  }, []);

  // 高级查询语法解析: 支持 "field:value" 形式
  // 例如: "type:image status:completed hello"
  const parseQuery = useCallback((query: string): SearchFilters => {
    const result: SearchFilters = { ...defaultFilters, searchFields: ['filename', 'url'] };
    const tokens: string[] = [];
    const fieldRegex = /(\w+):("[^"]+"|\S+)/g;
    let match;
    
    while ((match = fieldRegex.exec(query)) !== null) {
      const [, field, rawValue] = match;
      const value = rawValue.replace(/^"|"$/g, '');
      
      switch (field.toLowerCase()) {
        case 'type':
          result.type = value.split(',') as SearchFilters['type'];
          break;
        case 'status':
          result.status = value.split(',') as SearchFilters['status'];
          break;
        case 'category':
          result.category = Number(value) || null;
          break;
        case 'start':
          result.dateRange.start = value;
          break;
        case 'end':
          result.dateRange.end = value;
          break;
        case 'sort':
          if (['created_at', 'file_size', 'original_name'].includes(value)) {
            result.sortBy = value as SearchFilters['sortBy'];
          }
          break;
        case 'order':
          if (['asc', 'desc'].includes(value)) {
            result.sortOrder = value as SearchFilters['sortOrder'];
          }
          break;
        case 'regex':
          result.regexEnabled = value === 'true' || value === '1';
          break;
        case 'case':
          result.caseSensitive = value === 'true' || value === '1';
          break;
        default:
          tokens.push(`${field}:${rawValue}`);
      }
    }
    
    // 剩余部分作为普通关键词
    const remaining = query.replace(fieldRegex, '').trim();
    result.keyword = remaining || tokens.join(' ');
    return result;
  }, []);

  // 生成可分享的 URL
  const buildShareUrl = useCallback((): string => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('q', filters.keyword);
    if (filters.type.length) params.set('type', filters.type.join(','));
    if (filters.status.length) params.set('status', filters.status.join(','));
    if (filters.category !== null) params.set('category', String(filters.category));
    if (filters.dateRange.start) params.set('start', filters.dateRange.start);
    if (filters.dateRange.end) params.set('end', filters.dateRange.end);
    if (filters.sortBy !== defaultFilters.sortBy) params.set('sort', filters.sortBy);
    if (filters.sortOrder !== defaultFilters.sortOrder) params.set('order', filters.sortOrder);
    if (filters.regexEnabled) params.set('regex', '1');
    if (filters.caseSensitive) params.set('case', '1');
    
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}`
      : '';
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }, [filters]);

  // 导出结果 - 由后面的 useMemo 提供的 filteredData
  // 计算搜索建议 - 由后面的 useMemo 提供的 filteredData
  const highlightMatch = useCallback((text: string, keyword: string): string => {
    if (!keyword || !text) return text;
    
    try {
      const regex = filters.regexEnabled 
        ? new RegExp(keyword, filters.caseSensitive ? 'g' : 'gi')
        : new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), filters.caseSensitive ? 'g' : 'gi');
      
      return text.replace(regex, (match) => `<mark class="search-highlight">${match}</mark>`);
    } catch {
      return text;
    }
  }, [filters.regexEnabled, filters.caseSensitive]);

  const { filteredData, matches } = useMemo(() => {
    let result = [...data];
    const foundMatches: SearchMatch[] = [];
    const keyword = debouncedKeyword;

    if (keyword) {
      let regex: RegExp | null = null;
      
      try {
        if (filters.regexEnabled) {
          regex = new RegExp(keyword, filters.caseSensitive ? '' : 'i');
        } else {
          const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          regex = new RegExp(escapedKeyword, filters.caseSensitive ? '' : 'i');
        }
      } catch {
        regex = null;
      }

      result = result.filter(item => {
        const itemAny = item as any;
        const id = itemAny.id || itemAny._id || JSON.stringify(item);
        
        for (const field of filters.searchFields) {
          const value = itemAny[field] || '';
          const valueStr = String(value);
          
          let matchesKeyword = false;
          if (regex) {
            matchesKeyword = regex.test(valueStr);
          } else {
            const compareValue = filters.caseSensitive ? valueStr : valueStr.toLowerCase();
            const compareKeyword = filters.caseSensitive ? keyword : keyword.toLowerCase();
            matchesKeyword = compareValue.includes(compareKeyword);
          }

          if (matchesKeyword) {
            foundMatches.push({
              id,
              field,
              value: valueStr,
              match: keyword
            });
            return true;
          }
        }
        
        return false;
      });
    }

    if (filters.type.length > 0) {
      result = result.filter(item => {
        const itemAny = item as any;
        const mimeType = itemAny.mime_type || itemAny.type || '';
        return filters.type.some(type => {
          switch (type) {
            case 'image':
              return mimeType.startsWith('image/');
            case 'video':
              return mimeType.startsWith('video/');
            case 'audio':
              return mimeType.startsWith('audio/');
            case 'document':
              return mimeType.includes('pdf') || 
                     mimeType.includes('word') || 
                     mimeType.includes('document') ||
                     mimeType.includes('text');
            case 'archive':
              return mimeType.includes('zip') || 
                     mimeType.includes('rar') || 
                     mimeType.includes('tar') ||
                     mimeType.includes('gzip');
            default:
              return true;
          }
        });
      });
    }

    if (filters.status.length > 0) {
      result = result.filter(item => {
        const itemAny = item as any;
        return filters.status.includes(itemAny.status);
      });
    }

    if (filters.category !== null) {
      result = result.filter(item => {
        const itemAny = item as any;
        return itemAny.category_id === filters.category;
      });
    }

    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start);
      result = result.filter(item => {
        const itemAny = item as any;
        const itemDate = new Date(itemAny.created_at || itemAny.createdAt);
        return itemDate >= startDate;
      });
    }

    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(item => {
        const itemAny = item as any;
        const itemDate = new Date(itemAny.created_at || itemAny.createdAt);
        return itemDate <= endDate;
      });
    }

    result.sort((a, b) => {
      const aAny = a as any;
      const bAny = b as any;
      
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'created_at':
          const dateA = new Date(aAny.created_at || aAny.createdAt).getTime();
          const dateB = new Date(bAny.created_at || bAny.createdAt).getTime();
          comparison = dateA - dateB;
          break;
        case 'file_size':
          comparison = (aAny.file_size || aAny.totalBytes || 0) - (bAny.file_size || bAny.totalBytes || 0);
          break;
        case 'original_name':
          comparison = (aAny.original_name || aAny.filename || '').localeCompare(bAny.original_name || bAny.filename || '');
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return { filteredData: result, matches: foundMatches };
  }, [data, debouncedKeyword, filters]);

  // 导出结果
  const exportResults = useCallback((format: 'json' | 'csv'): string => {
    if (format === 'json') {
      return JSON.stringify(filteredData, null, 2);
    }
    
    // CSV 格式
    if (filteredData.length === 0) return '';
    const data = filteredData as any[];
    const first = data[0];
    const headers = Object.keys(first);
    
    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const rows = data.map(item => 
      headers.map(h => escapeCsv(item[h])).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }, [filteredData]);

  // 计算搜索建议
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const result: SearchSuggestion[] = [];
    const keyword = filters.keyword.trim();
    
    if (!keyword) {
      // 空关键词时显示最近历史和常用预设
      searchHistory.slice(0, 3).forEach(term => {
        result.push({
          type: 'history',
          value: term,
          display: term,
          icon: '🕐'
        });
      });
      presets.slice(0, 3).forEach(preset => {
        result.push({
          type: 'preset',
          value: preset.id,
          display: preset.name,
          icon: '⭐',
          metadata: { filters: preset.filters }
        });
      });
      return result.slice(0, maxSuggestions);
    }

    // 关键词建议
    const lower = keyword.toLowerCase();
    
    // 1. 匹配历史记录
    searchHistory
      .filter(term => term.toLowerCase().includes(lower) && term !== keyword)
      .slice(0, 3)
      .forEach(term => {
        result.push({
          type: 'history',
          value: term,
          display: term,
          icon: '🕐'
        });
      });

    // 2. 匹配预设名称
    presets
      .filter(p => p.name.toLowerCase().includes(lower))
      .slice(0, 2)
      .forEach(preset => {
        result.push({
          type: 'preset',
          value: preset.id,
          display: preset.name,
          icon: '⭐'
        });
      });

    // 3. 匹配数据中的文件名/URL
    const dataItems = data as any[];
    const filenameSet = new Set<string>();
    const urlSet = new Set<string>();
    
    dataItems.forEach(item => {
      const fn = item.filename || item.original_name;
      const url = item.url;
      if (fn && String(fn).toLowerCase().includes(lower) && !filenameSet.has(fn)) {
        filenameSet.add(fn);
      }
      if (url && String(url).toLowerCase().includes(lower) && !urlSet.has(url)) {
        urlSet.add(url);
      }
    });

    Array.from(filenameSet).slice(0, 2).forEach(fn => {
      result.push({ type: 'filename', value: fn, display: fn, icon: '📄' });
    });
    Array.from(urlSet).slice(0, 1).forEach(url => {
      try {
        const u = new URL(url);
        result.push({ type: 'url', value: url, display: u.hostname + u.pathname, icon: '🔗' });
      } catch {
        result.push({ type: 'url', value: url, display: url, icon: '🔗' });
      }
    });

    // 4. 高级语法建议
    if (!keyword.includes(':')) {
      const fieldHints = [
        { v: 'type:', d: 'type:image,video,document', i: '🏷️' },
        { v: 'status:', d: 'status:completed,downloading', i: '📊' },
        { v: 'sort:', d: 'sort:file_size', i: '🔄' }
      ];
      fieldHints.slice(0, 1).forEach(hint => {
        result.push({
          type: 'field',
          value: `${hint.v}${keyword}`,
          display: `${hint.i} ${hint.d}`,
          icon: hint.i
        });
      });
    }

    return result.slice(0, maxSuggestions);
  }, [filters.keyword, searchHistory, presets, data, maxSuggestions]);

  return {
    filters,
    filteredData,
    isSearching,
    searchHistory,
    totalCount: data.length,
    filteredCount: filteredData.length,
    matches,
    suggestions,
    presets,
    setFilters,
    resetFilters,
    clearSearch,
    setKeyword,
    addToHistory,
    clearHistory,
    removeFromHistory,
    highlightMatch,
    savePreset,
    loadPreset,
    deletePreset,
    applyPresetFilters,
    exportResults,
    parseQuery,
    buildShareUrl
  };
}

export default useSearch;