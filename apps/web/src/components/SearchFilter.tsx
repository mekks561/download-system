import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from './ui/shadcn/Button';
import { Input } from './ui/shadcn/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/shadcn/Select';
import { Badge } from './ui/shadcn/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/shadcn/Dialog';
import SearchHistory from './SearchHistory';
import { AISearchSuggestion, AIQueryRewrite } from '../services/AISearchService';


interface Category {
  id: number;
  name: string;
  color: string;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface SearchFilters {
  keyword: string;
  type: string[];
  status: string[];
  category: number | null;
  tags: number[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  sortBy: 'created_at' | 'file_size' | 'original_name';
  sortOrder: 'asc' | 'desc';
  searchFields: ('filename' | 'url')[];
  regexEnabled: boolean;
  caseSensitive: boolean;
  fuzzySearch: boolean;
}

interface SearchSuggestion {
  type: 'history' | 'preset' | 'filename' | 'url' | 'field';
  value: string;
  display: string;
  icon: string;
  metadata?: Record<string, unknown>;
}

interface SearchPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: number;
  usageCount: number;
}

interface SearchFilterProps {
  onSearch: (filters: SearchFilters) => void;
  categories: Category[];
  tags?: Tag[];
  maxHistory?: number;
  searchCount?: number;
  isSearching?: boolean;
  suggestions?: SearchSuggestion[];
  presets?: SearchPreset[];
  onSavePreset?: (name: string, filters: SearchFilters) => void;
  onLoadPreset?: (id: string) => void;
  onDeletePreset?: (id: string) => void;
  onShare?: (url: string) => void;
  onExport?: (format: 'json' | 'csv') => void;
  onAdvancedSearch?: (query: string) => void;
  aiSuggestions?: AISearchSuggestion[];
  aiQueryRewrite?: AIQueryRewrite | null;
  isAIEnabled?: boolean;
  ref?: React.Ref<HTMLInputElement>;
}

const SearchFilter = ({
  onSearch,
  categories,
  tags = [],
  maxHistory = 10,
  searchCount = 0,
  isSearching = false,
  suggestions = [],
  presets = [],
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onShare,
  onExport,
  onAdvancedSearch,
  aiSuggestions = [],
  aiQueryRewrite: _aiQueryRewrite = null,
  isAIEnabled = false,
  ref,
}: SearchFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    type: [],
    status: [],
    category: null,
    tags: [],
    dateRange: {
      start: null,
      end: null,
    },
    sortBy: 'created_at',
    sortOrder: 'desc',
    searchFields: ['filename', 'url'],
    regexEnabled: false,
    caseSensitive: false,
    fuzzySearch: true,
  });
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        return JSON.parse(savedHistory) as string[];
      } catch {
        // ignore
      }
    }
    return [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSearchHistoryDialog, setShowSearchHistoryDialog] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof ref === 'function') {
      ref(inputRef.current);
    } else if (ref !== null && ref !== undefined) {
      ref.current = inputRef.current;
    }
  }, [ref]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(filters);
    }, filters.regexEnabled ? 500 : 300);

    return () => clearTimeout(debounceTimer);
  }, [filters, onSearch]);

  const handleKeywordChange = useCallback((keyword: string) => {
    setFilters({ ...filters, keyword });
    setShowSuggestions(true);
    setActiveIndex(-1);

    if (keyword && !searchHistory.includes(keyword)) {
      const newHistory = [keyword, ...searchHistory].slice(0, maxHistory);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  }, [filters, searchHistory, maxHistory]);

  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.type === 'preset') {
        onLoadPreset?.(suggestion.value);
      } else {
        setFilters({ ...filters, keyword: suggestion.value });
      }
      setShowSuggestions(false);
      setShowHistory(false);
      setActiveIndex(-1);
    },
    [filters, onLoadPreset]
  );

  const totalSuggestions = useMemo(() => {
    return (isAIEnabled ? aiSuggestions.length : 0) + suggestions.length;
  }, [aiSuggestions, suggestions, isAIEnabled]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showSuggestions && totalSuggestions > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, totalSuggestions - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
          e.preventDefault();
          if (isAIEnabled && activeIndex < aiSuggestions.length) {
            const aiSuggestion = aiSuggestions[activeIndex];
            handleKeywordChange(aiSuggestion.query);
            setShowSuggestions(false);
            setActiveIndex(-1);
          } else {
            const regularIndex = isAIEnabled ? activeIndex - aiSuggestions.length : activeIndex;
            if (regularIndex >= 0 && regularIndex < suggestions.length) {
              handleSuggestionClick(suggestions[regularIndex]);
            }
          }
        } else if (e.key === 'Escape') {
          setShowSuggestions(false);
          setActiveIndex(-1);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onAdvancedSearch?.(filters.keyword);
      }
    },
    [showSuggestions, suggestions, aiSuggestions, activeIndex, filters.keyword, onAdvancedSearch, handleSuggestionClick, handleKeywordChange, isAIEnabled, totalSuggestions]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleArrayFilter = (field: 'type' | 'status', value: string) => {
    const current = filters[field];
    const updated = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setFilters({ ...filters, [field]: updated });
  };

  const toggleTag = (tagId: number) => {
    const current = filters.tags;
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    setFilters({ ...filters, tags: updated });
  };

  const toggleSearchField = (field: 'filename' | 'url') => {
    const current = filters.searchFields;
    const updated = current.includes(field)
      ? current.filter((f) => f !== field)
      : [...current, field];
    setFilters({ ...filters, searchFields: updated.length > 0 ? updated : ['filename', 'url'] });
  };

  const clearFilters = () => {
    setFilters({
      keyword: '',
      type: [],
      status: [],
      category: null,
      tags: [],
      dateRange: {
        start: null,
        end: null,
      },
      sortBy: 'created_at',
      sortOrder: 'desc',
      searchFields: ['filename', 'url'],
      regexEnabled: false,
      caseSensitive: false,
      fuzzySearch: true,
    });
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset?.(presetName.trim(), filters);
      setShowSaveDialog(false);
      setPresetName('');
    }
  };

  const handleShare = () => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('q', filters.keyword);
    if (filters.type.length) params.set('type', filters.type.join(','));
    if (filters.status.length) params.set('status', filters.status.join(','));
    if (filters.category !== null) params.set('category', String(filters.category));
    if (filters.tags.length) params.set('tags', filters.tags.join(','));
    if (filters.dateRange.start) params.set('start', filters.dateRange.start);
    if (filters.dateRange.end) params.set('end', filters.dateRange.end);
    if (filters.sortBy !== 'created_at') params.set('sort', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('order', filters.sortOrder);
    if (filters.regexEnabled) params.set('regex', '1');
    if (filters.caseSensitive) params.set('case', '1');
    if (!filters.fuzzySearch) params.set('fuzzy', '0');

    const url = params.toString()
      ? `${window.location.origin}${window.location.pathname}?${params.toString()}`
      : window.location.href;
    setShareUrl(url);
    setShowShareDialog(true);
    onShare?.(url);
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    onExport?.(format);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.keyword ||
      filters.type.length > 0 ||
      filters.status.length > 0 ||
      filters.category !== null ||
      filters.tags.length > 0 ||
      filters.dateRange.start !== null ||
      filters.dateRange.end !== null
    );
  }, [filters]);

  const fileTypes = [
    { value: 'image', label: '🖼️ 图片' },
    { value: 'video', label: '🎬 视频' },
    { value: 'audio', label: '🎵 音频' },
    { value: 'document', label: '📄 文档' },
    { value: 'archive', label: '📦 压缩包' },
    { value: 'other', label: '📁 其他' },
  ];

  const statusOptions = [
    { value: 'pending', label: '⏳ 等待中' },
    { value: 'downloading', label: '⬇️ 下载中' },
    { value: 'completed', label: '✅ 已完成' },
    { value: 'failed', label: '❌ 失败' },
    { value: 'paused', label: '⏸️ 已暂停' },
  ];

  return (
    <div className="w-full bg-white rounded-xl shadow-sm overflow-hidden">
      <div
        className={`flex gap-2 p-3 md:p-4 items-center flex-wrap ${
          isExpanded ? 'border-b border-gray-200' : ''
        }`}
      >
        <div className="flex-1 min-w-40 md:min-w-60 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">🔍</span>
          <Input
            ref={inputRef}
            type="text"
            className="pl-9 pr-9"
            placeholder="搜索文件名或URL... (Ctrl+F 聚焦, Ctrl+Enter 高级搜索)"
            value={filters.keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onFocus={() => {
              setShowHistory(true);
              setShowSuggestions(true);
            }}
            onBlur={() =>
              setTimeout(() => {
                setShowHistory(false);
                setShowSuggestions(false);
              }, 200)
            }
          />
          {isSearching && (
            <span className="absolute right-9 top-1/2 -translate-y-1/2 text-base animate-spin">
              🔄
            </span>
          )}
          {filters.keyword && !isSearching && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-xl text-gray-400 cursor-pointer p-0 leading-none hover:text-gray-600"
              onClick={() => handleKeywordChange('')}
            >
              ×
            </button>
          )}

          {showSuggestions && filters.keyword && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 max-h-96 overflow-y-auto">
              {aiSuggestions.length > 0 && isAIEnabled && (
                <>
                  <div className="px-3 py-2.5 text-xs text-purple-600 font-semibold border-b border-gray-200 bg-purple-50 flex items-center gap-1.5">
                    🤖 AI 智能建议
                  </div>
                  {aiSuggestions.map((aiSuggestion, index) => (
                    <div
                      key={`ai-${aiSuggestion.id}`}
                      className={`px-3 py-2.5 cursor-pointer text-sm text-gray-700 flex items-center gap-2.5 transition-colors ${
                        activeIndex === index ? 'bg-purple-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        handleKeywordChange(aiSuggestion.query);
                        setShowSuggestions(false);
                        setActiveIndex(-1);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="text-base">🤖</span>
                      <div className="flex-1">
                        <span className="truncate">{aiSuggestion.query}</span>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{aiSuggestion.description}</p>
                      </div>
                      <span className="text-xs opacity-60">
                        {aiSuggestion.type === 'semantic' && '💬'}
                        {aiSuggestion.type === 'related' && '📎'}
                        {aiSuggestion.type === 'history' && '🕐'}
                        {aiSuggestion.type === 'popular' && '🔥'}
                      </span>
                    </div>
                  ))}
                  <div className="h-px bg-gray-200" />
                </>
              )}
              <div className="px-3 py-2.5 text-xs text-gray-500 font-semibold border-b border-gray-200 bg-gray-50">
                💡 搜索建议
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.value}`}
                  className={`px-3 py-2.5 cursor-pointer text-sm text-gray-700 flex items-center gap-2.5 transition-colors ${
                    activeIndex === (aiSuggestions.length > 0 && isAIEnabled ? index + aiSuggestions.length : index) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setActiveIndex(aiSuggestions.length > 0 && isAIEnabled ? index + aiSuggestions.length : index)}
                >
                  <span className="text-base">{suggestion.icon}</span>
                  <span className="flex-1 truncate">{suggestion.display}</span>
                  <span className="text-xs opacity-60">
                    {suggestion.type === 'history' && '🕐'}
                    {suggestion.type === 'preset' && '⭐'}
                    {suggestion.type === 'filename' && '📄'}
                    {suggestion.type === 'url' && '🔗'}
                    {suggestion.type === 'field' && '🏷️'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {showHistory && !filters.keyword && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 max-h-72 overflow-y-auto">
              <div className="px-3 py-2.5 text-xs text-gray-500 font-semibold border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <span>🔙 搜索历史</span>
                <button
                  className="bg-none border-none text-error-500 text-xs cursor-pointer py-0.5 px-1.5 hover:text-error-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchHistory([]);
                    localStorage.removeItem('searchHistory');
                  }}
                >
                  清空
                </button>
              </div>
              {searchHistory.map((term) => (
                <div
                  key={`history-${term}`}
                  className="px-3 py-2.5 cursor-pointer text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    handleKeywordChange(term);
                    setShowHistory(false);
                  }}
                >
                  ⏱️ {term}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1 items-center">
          {filters.searchFields.includes('filename') && (
            <Badge variant="default" className="text-xs">
              📄
            </Badge>
          )}
          {filters.searchFields.includes('url') && (
            <Badge variant="default" className="text-xs">
              🔗
            </Badge>
          )}
          {filters.fuzzySearch && (
            <Badge variant="default" className="text-xs">
              🔮
            </Badge>
          )}
          {filters.regexEnabled && (
            <Badge variant="default" className="text-xs">
              📝
            </Badge>
          )}
          {filters.caseSensitive && (
            <Badge variant="default" className="text-xs">
              Aa
            </Badge>
          )}
        </div>

        <Button variant="outline" size="icon" onClick={handleShare} title="分享搜索结果">
          🔗
        </Button>

        <Button variant="outline" size="icon" onClick={() => handleExport('csv')} title="导出为 CSV">
          📥
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowPresets(!showPresets)}
          title="预设管理"
          className="relative"
        >
          ⭐
          {presets.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center px-1">
              {presets.length}
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSearchHistoryDialog(true)}
          title="搜索历史"
          className="relative"
        >
          🕐
          {searchHistory.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center px-1">
              {searchHistory.length}
            </span>
          )}
        </Button>

        <Button
          variant="secondary"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative"
        >
          🎛️ 筛选
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-error-500 rounded-full" />
          )}
        </Button>
      </div>

      {showPresets && (
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-900 m-0">⭐ 保存的搜索预设</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                disabled={!hasActiveFilters}
              >
                💾 保存当前筛选
              </Button>
              <Button variant="outline" size="icon" onClick={() => setShowPresets(false)}>
                ✕
              </Button>
            </div>
          </div>
          {presets.length === 0 ? (
            <div className="text-center py-5 text-gray-500 text-sm">
              <span>暂无预设</span>
              <p className="text-xs text-gray-400 mt-1 mb-0">
                设置筛选条件后点击"保存当前筛选"创建
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center p-2.5 bg-white border border-gray-200 rounded-md cursor-pointer hover:border-gray-300 transition-all"
                >
                  <div
                    className="flex-1 flex flex-col gap-0.5"
                    onClick={() => {
                      onLoadPreset?.(preset.id);
                      setShowPresets(false);
                    }}
                  >
                    <span className="text-sm font-medium text-gray-900">{preset.name}</span>
                    <span className="text-xs text-gray-500">
                      使用 {preset.usageCount} 次 ·{' '}
                      {new Date(preset.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePreset?.(preset.id);
                    }}
                  >
                    🗑️
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="p-5 bg-gray-50 border-t border-gray-200">
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-900 m-0 mb-3">🔍 搜索选项</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.searchFields.includes('filename') ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => toggleSearchField('filename')}
              >
                📄 文件名
              </Button>
              <Button
                variant={filters.searchFields.includes('url') ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => toggleSearchField('url')}
              >
                🔗 URL
              </Button>
              <Button
                variant={filters.fuzzySearch ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setFilters({ ...filters, fuzzySearch: !filters.fuzzySearch, regexEnabled: !filters.fuzzySearch ? filters.regexEnabled : false })
                }
              >
                🔮 模糊搜索
              </Button>
              <Button
                variant={filters.regexEnabled ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => setFilters({ ...filters, regexEnabled: !filters.regexEnabled, fuzzySearch: !filters.regexEnabled ? filters.fuzzySearch : false })}
              >
                📝 正则表达式
              </Button>
              <Button
                variant={filters.caseSensitive ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setFilters({ ...filters, caseSensitive: !filters.caseSensitive })
                }
              >
                Aa 大小写敏感
              </Button>
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-900 m-0 mb-3">📁 文件类型</h4>
            <div className="flex flex-wrap gap-2">
              {fileTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={filters.type.includes(type.value) ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => toggleArrayFilter('type', type.value)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-900 m-0 mb-3">📊 状态</h4>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <Button
                  key={status.value}
                  variant={filters.status.includes(status.value) ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => toggleArrayFilter('status', status.value)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-900 m-0 mb-3">📂 分类</h4>
              <Select
                value={filters.category !== null ? String(filters.category) : ''}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    category: value ? Number(value) : null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部分类</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tags.length > 0 && (
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-900 m-0 mb-3">🏷️ 标签</h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={filters.tags.includes(tag.id) ? 'default' : 'outline'}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={filters.tags.includes(tag.id) ? { backgroundColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-900 m-0 mb-3">📅 日期范围</h4>
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={filters.dateRange.start || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, start: e.target.value || null },
                  })
                }
              />
              <span className="text-gray-500 text-sm">至</span>
              <Input
                type="date"
                value={filters.dateRange.end || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, end: e.target.value || null },
                  })
                }
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const sevenDaysAgo = new Date(now);
                  sevenDaysAgo.setDate(now.getDate() - 7);
                  setFilters({
                    ...filters,
                    dateRange: {
                      start: sevenDaysAgo.toISOString().split('T')[0],
                      end: now.toISOString().split('T')[0],
                    },
                  });
                }}
              >
                近7天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const thirtyDaysAgo = new Date(now);
                  thirtyDaysAgo.setDate(now.getDate() - 30);
                  setFilters({
                    ...filters,
                    dateRange: {
                      start: thirtyDaysAgo.toISOString().split('T')[0],
                      end: now.toISOString().split('T')[0],
                    },
                  });
                }}
              >
                近30天
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  setFilters({
                    ...filters,
                    dateRange: {
                      start: thisMonth.toISOString().split('T')[0],
                      end: now.toISOString().split('T')[0],
                    },
                  });
                }}
              >
                本月
              </Button>
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-900 m-0 mb-3">🔄 排序</h4>
            <div className="flex gap-3">
              <Select
                value={filters.sortBy}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    sortBy: value as SearchFilters['sortBy'],
                  })
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">创建时间</SelectItem>
                  <SelectItem value="file_size">文件大小</SelectItem>
                  <SelectItem value="original_name">文件名</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    ...filters,
                    sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
              >
                {filters.sortOrder === 'asc' ? '⬆️ 升序' : '⬇️ 降序'}
              </Button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-between items-center flex-wrap gap-2 pt-4 border-t border-gray-200 mt-4">
              <div className="flex gap-2">
                <Button variant="destructive" onClick={clearFilters}>
                  🗑️ 清除所有筛选
                </Button>
                <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
                  💾 保存为预设
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                {isSearching ? (
                  <span>🔍 搜索中...</span>
                ) : (
                  <span>
                    共找到 <strong className="text-gray-700">{searchCount}</strong> 个匹配项
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>💾 保存搜索预设</DialogTitle>
            <DialogDescription>为当前的筛选条件命名，以便快速访问</DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            placeholder="预设名称..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔗 分享搜索结果</DialogTitle>
            <DialogDescription>复制以下链接分享给他人</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              type="text"
              value={shareUrl}
              readOnly
              onClick={(e) => e.currentTarget.select()}
              className="font-mono text-xs bg-gray-50"
            />
            <Button
              variant={copied ? 'default' : 'default'}
              onClick={() => void copyShareUrl()}
              className={copied ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
            >
              {copied ? '✓ 已复制' : '📋 复制'}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SearchHistory
        isOpen={showSearchHistoryDialog}
        onClose={() => setShowSearchHistoryDialog(false)}
        history={searchHistory}
        onSelect={handleKeywordChange}
        onRemove={(keyword) => {
          const newHistory = searchHistory.filter(h => h !== keyword);
          setSearchHistory(newHistory);
          localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        }}
        onClear={() => {
          setSearchHistory([]);
          localStorage.removeItem('searchHistory');
        }}
      />
    </div>
  );
};

export default SearchFilter;
