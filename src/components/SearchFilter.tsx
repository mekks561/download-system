import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface Category {
  id: number;
  name: string;
  color: string;
}

interface SearchFilters {
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
}

const SearchFilter: React.FC<SearchFilterProps> = ({ 
  onSearch, 
  categories,
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
  onAdvancedSearch
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
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
  });
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(filters);
    }, filters.regexEnabled ? 500 : 300);

    return () => clearTimeout(debounceTimer);
  }, [filters, onSearch]);

  const handleKeywordChange = (keyword: string) => {
    setFilters({ ...filters, keyword });
    setShowSuggestions(true);
    setActiveIndex(-1);
    
    if (keyword && !searchHistory.includes(keyword)) {
      const newHistory = [keyword, ...searchHistory].slice(0, maxHistory);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'preset') {
      onLoadPreset?.(suggestion.value);
    } else {
      setFilters({ ...filters, keyword: suggestion.value });
    }
    setShowSuggestions(false);
    setShowHistory(false);
    setActiveIndex(-1);
  }, [filters, onLoadPreset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 建议列表键盘导航
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[activeIndex]);
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
  }, [showSuggestions, suggestions, activeIndex, filters.keyword, onAdvancedSearch, handleSuggestionClick]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown as any);
    return () => document.removeEventListener('keydown', handleKeyDown as any);
  }, [handleKeyDown]);

  const toggleArrayFilter = (field: 'type' | 'status', value: string) => {
    const current = filters[field];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    setFilters({ ...filters, [field]: updated });
  };

  const toggleSearchField = (field: 'filename' | 'url') => {
    const current = filters.searchFields;
    const updated = current.includes(field)
      ? current.filter(f => f !== field)
      : [...current, field];
    setFilters({ ...filters, searchFields: updated.length > 0 ? updated : ['filename', 'url'] });
  };

  const clearFilters = () => {
    setFilters({
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
    if (filters.dateRange.start) params.set('start', filters.dateRange.start);
    if (filters.dateRange.end) params.set('end', filters.dateRange.end);
    if (filters.sortBy !== 'created_at') params.set('sort', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('order', filters.sortOrder);
    if (filters.regexEnabled) params.set('regex', '1');
    if (filters.caseSensitive) params.set('case', '1');
    
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
    return filters.keyword ||
           filters.type.length > 0 ||
           filters.status.length > 0 ||
           filters.category !== null ||
           filters.dateRange.start !== null ||
           filters.dateRange.end !== null;
  }, [filters]);

  const fileTypes = [
    { value: 'image', label: '🖼️ 图片' },
    { value: 'video', label: '🎬 视频' },
    { value: 'audio', label: '🎵 音频' },
    { value: 'document', label: '📄 文档' },
    { value: 'archive', label: '📦 压缩包' },
    { value: 'other', label: '📁 其他' }
  ];

  const statusOptions = [
    { value: 'pending', label: '⏳ 等待中' },
    { value: 'downloading', label: '⬇️ 下载中' },
    { value: 'completed', label: '✅ 已完成' },
    { value: 'failed', label: '❌ 失败' },
    { value: 'paused', label: '⏸️ 已暂停' }
  ];

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.searchBar,
        borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
      }}>
        <div style={styles.searchInputWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            style={styles.searchInput}
            placeholder="搜索文件名或URL... (Ctrl+F 聚焦, Ctrl+Enter 高级搜索)"
            value={filters.keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onFocus={() => {
              setShowHistory(true);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => {
              setShowHistory(false);
              setShowSuggestions(false);
            }, 200)}
          />
          {isSearching && (
            <span style={styles.loadingIcon}>🔄</span>
          )}
          {filters.keyword && !isSearching && (
            <button
              style={styles.clearButton}
              onClick={() => handleKeywordChange('')}
            >
              ×
            </button>
          )}

          {/* 搜索建议下拉 */}
          {showSuggestions && suggestions.length > 0 && filters.keyword && (
            <div style={styles.suggestionsDropdown}>
              <div style={styles.suggestionsHeader}>
                <span>💡 搜索建议</span>
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.value}-${index}`}
                  style={{
                    ...styles.suggestionItem,
                    ...(activeIndex === index ? styles.suggestionItemActive : {})
                  }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span style={styles.suggestionIcon}>{suggestion.icon}</span>
                  <span style={styles.suggestionText}>{suggestion.display}</span>
                  <span style={styles.suggestionType}>
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

          {/* 搜索历史下拉 */}
          {showHistory && !filters.keyword && searchHistory.length > 0 && (
            <div style={styles.historyDropdown}>
              <div style={styles.historyHeader}>
                <span>🔙 搜索历史</span>
                <button 
                  style={styles.clearHistoryButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchHistory([]);
                    localStorage.removeItem('searchHistory');
                  }}
                >
                  清空
                </button>
              </div>
              {searchHistory.map((term, index) => (
                <div
                  key={index}
                  style={styles.historyItem}
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

        <div style={styles.searchOptions}>
          {filters.searchFields.includes('filename') && (
            <span style={styles.searchFieldBadge}>📄</span>
          )}
          {filters.searchFields.includes('url') && (
            <span style={styles.searchFieldBadge}>🔗</span>
          )}
          {filters.regexEnabled && (
            <span style={styles.searchFieldBadge}>📝</span>
          )}
          {filters.caseSensitive && (
            <span style={styles.searchFieldBadge}>Aa</span>
          )}
        </div>

        <button
          style={styles.iconButton}
          onClick={handleShare}
          title="分享搜索结果"
        >
          🔗
        </button>

        <button
          style={styles.iconButton}
          onClick={() => handleExport('csv')}
          title="导出为 CSV"
        >
          📥
        </button>

        <button
          style={styles.iconButton}
          onClick={() => setShowPresets(!showPresets)}
          title="预设管理"
        >
          ⭐ {presets.length > 0 && `(${presets.length})`}
        </button>

        <button
          style={styles.filterToggle}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          🎛️ 筛选 {hasActiveFilters && <span style={styles.activeBadge}>●</span>}
        </button>
      </div>

      {/* 预设管理面板 */}
      {showPresets && (
        <div style={styles.presetsPanel}>
          <div style={styles.presetsHeader}>
            <h4 style={styles.presetsTitle}>⭐ 保存的搜索预设</h4>
            <div style={styles.presetsActions}>
              <button
                style={styles.savePresetButton}
                onClick={() => setShowSaveDialog(true)}
                disabled={!hasActiveFilters}
              >
                💾 保存当前筛选
              </button>
              <button
                style={styles.closeButton}
                onClick={() => setShowPresets(false)}
              >
                ✕
              </button>
            </div>
          </div>
          {presets.length === 0 ? (
            <div style={styles.emptyPresets}>
              <span>暂无预设</span>
              <p style={styles.emptyHint}>设置筛选条件后点击"保存当前筛选"创建</p>
            </div>
          ) : (
            <div style={styles.presetsList}>
              {presets.map(preset => (
                <div key={preset.id} style={styles.presetItem}>
                  <div 
                    style={styles.presetInfo}
                    onClick={() => {
                      onLoadPreset?.(preset.id);
                      setShowPresets(false);
                    }}
                  >
                    <span style={styles.presetName}>{preset.name}</span>
                    <span style={styles.presetMeta}>
                      使用 {preset.usageCount} 次 · {new Date(preset.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    style={styles.deletePresetButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePreset?.(preset.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div style={styles.filterPanel}>
          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>🔍 搜索选项</h4>
            <div style={styles.filterChips}>
              <button
                style={{
                  ...styles.filterChip,
                  ...(filters.searchFields.includes('filename') ? styles.filterChipActive : {})
                }}
                onClick={() => toggleSearchField('filename')}
              >
                📄 文件名
              </button>
              <button
                style={{
                  ...styles.filterChip,
                  ...(filters.searchFields.includes('url') ? styles.filterChipActive : {})
                }}
                onClick={() => toggleSearchField('url')}
              >
                🔗 URL
              </button>
              <button
                style={{
                  ...styles.filterChip,
                  ...(filters.regexEnabled ? styles.filterChipActive : {})
                }}
                onClick={() => setFilters({ ...filters, regexEnabled: !filters.regexEnabled })}
              >
                📝 正则表达式
              </button>
              <button
                style={{
                  ...styles.filterChip,
                  ...(filters.caseSensitive ? styles.filterChipActive : {})
                }}
                onClick={() => setFilters({ ...filters, caseSensitive: !filters.caseSensitive })}
              >
                Aa 大小写敏感
              </button>
            </div>
          </div>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>📁 文件类型</h4>
            <div style={styles.filterChips}>
              {fileTypes.map((type) => (
                <button
                  key={type.value}
                  style={{
                    ...styles.filterChip,
                    ...(filters.type.includes(type.value) ? styles.filterChipActive : {})
                  }}
                  onClick={() => toggleArrayFilter('type', type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>📊 状态</h4>
            <div style={styles.filterChips}>
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  style={{
                    ...styles.filterChip,
                    ...(filters.status.includes(status.value) ? styles.filterChipActive : {})
                  }}
                  onClick={() => toggleArrayFilter('status', status.value)}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div style={styles.filterSection}>
              <h4 style={styles.filterTitle}>📂 分类</h4>
              <select
                style={styles.select}
                value={filters.category || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  category: e.target.value ? Number(e.target.value) : null
                })}
              >
                <option value="">全部分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>📅 日期范围</h4>
            <div style={styles.dateRange}>
              <input
                type="date"
                style={styles.dateInput}
                value={filters.dateRange.start || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value || null }
                })}
              />
              <span style={styles.dateSeparator}>至</span>
              <input
                type="date"
                style={styles.dateInput}
                value={filters.dateRange.end || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value || null }
                })}
              />
            </div>
            <div style={styles.quickDateButtons}>
              <button
                style={styles.quickDateButton}
                onClick={() => {
                  const now = new Date();
                  const sevenDaysAgo = new Date(now);
                  sevenDaysAgo.setDate(now.getDate() - 7);
                  setFilters({
                    ...filters,
                    dateRange: {
                      start: sevenDaysAgo.toISOString().split('T')[0],
                      end: now.toISOString().split('T')[0]
                    }
                  });
                }}
              >
                近7天
              </button>
              <button
                style={styles.quickDateButton}
                onClick={() => {
                  const now = new Date();
                  const thirtyDaysAgo = new Date(now);
                  thirtyDaysAgo.setDate(now.getDate() - 30);
                  setFilters({
                    ...filters,
                    dateRange: {
                      start: thirtyDaysAgo.toISOString().split('T')[0],
                      end: now.toISOString().split('T')[0]
                    }
                  });
                }}
              >
                近30天
              </button>
              <button
                style={styles.quickDateButton}
                onClick={() => {
                  const now = new Date();
                  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  setFilters({
                    ...filters,
                    dateRange: {
                      start: thisMonth.toISOString().split('T')[0],
                      end: now.toISOString().split('T')[0]
                    }
                  });
                }}
              >
                本月
              </button>
            </div>
          </div>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>🔄 排序</h4>
            <div style={styles.sortControls}>
              <select
                style={styles.select}
                value={filters.sortBy}
                onChange={(e) => setFilters({
                  ...filters,
                  sortBy: e.target.value as SearchFilters['sortBy']
                })}
              >
                <option value="created_at">创建时间</option>
                <option value="file_size">文件大小</option>
                <option value="original_name">文件名</option>
              </select>
              
              <button
                style={styles.sortOrderButton}
                onClick={() => setFilters({
                  ...filters,
                  sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
                })}
              >
                {filters.sortOrder === 'asc' ? '⬆️ 升序' : '⬇️ 降序'}
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <div style={styles.filterActions}>
              <button style={styles.clearFiltersButton} onClick={clearFilters}>
                🗑️ 清除所有筛选
              </button>
              <button 
                style={styles.savePresetInlineButton}
                onClick={() => setShowSaveDialog(true)}
              >
                💾 保存为预设
              </button>
              <div style={styles.filterSummary}>
                {isSearching ? (
                  <span>🔍 搜索中...</span>
                ) : (
                  <span>共找到 <strong>{searchCount}</strong> 个匹配项</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 保存预设对话框 */}
      {showSaveDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowSaveDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>💾 保存搜索预设</h3>
            <p style={styles.modalDesc}>为当前的筛选条件命名，以便快速访问</p>
            <input
              type="text"
              style={styles.modalInput}
              placeholder="预设名称..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
            />
            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setShowSaveDialog(false)}>
                取消
              </button>
              <button 
                style={styles.modalConfirm} 
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享对话框 */}
      {showShareDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowShareDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>🔗 分享搜索结果</h3>
            <p style={styles.modalDesc}>复制以下链接分享给他人</p>
            <div style={styles.shareUrlWrapper}>
              <input
                type="text"
                style={styles.shareUrlInput}
                value={shareUrl}
                readOnly
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                style={{
                  ...styles.copyButton,
                  ...(copied ? styles.copyButtonSuccess : {})
                }}
                onClick={copyShareUrl}
              >
                {copied ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.modalCancel} onClick={() => setShowShareDialog(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  searchBar: {
    display: 'flex',
    gap: '8px',
    padding: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchInputWrapper: {
    flex: 1,
    minWidth: '240px',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '16px',
  },
  loadingIcon: {
    position: 'absolute',
    right: '36px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '16px',
    animation: 'spin 1s linear infinite',
  },
  searchInput: {
    width: '100%',
    padding: '10px 36px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0',
    lineHeight: '1',
  },
  searchOptions: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  searchFieldBadge: {
    padding: '4px 8px',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  iconButton: {
    width: '36px',
    height: '36px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  historyDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    marginTop: '4px',
    zIndex: 100,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  historyHeader: {
    padding: '10px 12px',
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearHistoryButton: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '2px 6px',
  },
  historyItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    transition: 'background-color 0.2s',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    marginTop: '4px',
    zIndex: 100,
    maxHeight: '400px',
    overflowY: 'auto',
  },
  suggestionsHeader: {
    padding: '10px 12px',
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  suggestionItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background-color 0.2s',
  },
  suggestionItemActive: {
    backgroundColor: '#eff6ff',
  },
  suggestionIcon: {
    fontSize: '16px',
  },
  suggestionText: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  suggestionType: {
    fontSize: '12px',
    opacity: 0.6,
  },
  presetsPanel: {
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    padding: '16px 20px',
  },
  presetsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  presetsTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  presetsActions: {
    display: 'flex',
    gap: '8px',
  },
  savePresetButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  closeButton: {
    width: '28px',
    height: '28px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  emptyPresets: {
    textAlign: 'center',
    padding: '20px',
    color: '#6b7280',
    fontSize: '14px',
  },
  emptyHint: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  presetsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  presetItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  presetInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  presetName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a2e',
  },
  presetMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  deletePresetButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  filterToggle: {
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    position: 'relative',
  },
  activeBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '8px',
    height: '8px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    color: 'transparent',
  },
  filterPanel: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  filterSection: {
    marginBottom: '20px',
  },
  filterTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  filterChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  filterChip: {
    padding: '8px 14px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '20px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  dateInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  dateSeparator: {
    color: '#6b7280',
    fontSize: '14px',
  },
  quickDateButtons: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  quickDateButton: {
    padding: '6px 12px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  sortControls: {
    display: 'flex',
    gap: '12px',
  },
  sortOrderButton: {
    padding: '10px 16px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  filterActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    marginTop: '16px',
  },
  clearFiltersButton: {
    padding: '10px 20px',
    backgroundColor: '#fee',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  savePresetInlineButton: {
    padding: '10px 20px',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  filterSummary: {
    fontSize: '14px',
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  modalDesc: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#6b7280',
  },
  modalInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  },
  modalCancel: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  modalConfirm: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  shareUrlWrapper: {
    display: 'flex',
    gap: '8px',
  },
  shareUrlInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    backgroundColor: '#f9fafb',
    color: '#374151',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  copyButtonSuccess: {
    backgroundColor: '#10b981',
  },
};

export default SearchFilter;