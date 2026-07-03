import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useDownloadManager } from '../hooks/useDownloadManager';
import { StatsPanel } from '../components/StatsPanel';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchFilter from '../components/SearchFilter';
import { Pagination } from '../components/ui';
import type { DownloadItem as DownloadItemType } from '../types';
import { useSearch, SearchFilters } from '../hooks/useSearch';
import { Category } from '../components/CategoryManager';

const VirtualDownloadList = lazy(() => import('../components/VirtualDownloadList'));
const CategoryManager = lazy(() => import('../components/CategoryManager'));
const PerformanceTest = lazy(() => import('../components/PerformanceTest'));
const ScheduleManager = lazy(() => import('../components/ScheduleManager'));
const ShareManager = lazy(() => import('../components/ShareManager'));

const Downloads: React.FC = () => {
  const {
    downloads,
    addDownload,
    addBulkDownloads,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    clearCompleted,
  } = useDownloadManager();

  const [urlInput, setUrlInput] = useState('');
  const [filenameInput, setFilenameInput] = useState('');
  const [bulkUrlsInput, setBulkUrlsInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPerformanceTest, setShowPerformanceTest] = useState(false);
  const [isScheduleManagerOpen, setIsScheduleManagerOpen] = useState(false);
  const [isShareManagerOpen, setIsShareManagerOpen] = useState(false);

  const handleAddTestItems = useCallback((items: DownloadItemType[]) => {
    items.forEach(item => {
      addDownload(item.url, item.filename);
    });
  }, [addDownload]);

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: '视频', color: '#3b82f6', icon: '🎬', taskCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
    { id: '2', name: '音乐', color: '#10b981', icon: '🎵', taskCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
    { id: '3', name: '文档', color: '#f59e0b', icon: '📄', taskCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
    { id: '4', name: '软件', color: '#8b5cf6', icon: '💼', taskCount: 0, createdAt: Date.now(), updatedAt: Date.now() },
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const {
    filters,
    filteredData,
    isSearching,
    filteredCount,
    suggestions,
    presets,
    setFilters,
    setKeyword,
    savePreset,
    loadPreset,
    deletePreset,
    exportResults
  } = useSearch<DownloadItemType>(downloads, {
    debounceMs: 300,
    maxHistory: 10
  });

  const handleSearch = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, [setFilters]);

  const handleAdvancedSearch = useCallback((query: string) => {
    // 解析高级查询语法 field:value
    setKeyword(query);
  }, [setKeyword]);

  const handleExport = useCallback((format: 'json' | 'csv') => {
    const content = exportResults(format);
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downloads-search-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportResults]);

  const handleShare = useCallback((_url: string) => {
    // 分享 URL 已通过弹窗显示
  }, []);

  const handleLoadPreset = useCallback((presetId: string) => {
    loadPreset(presetId);
    setCurrentPage(1);
  }, [loadPreset]);

  const paginatedDownloads = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      const id = addDownload(urlInput.trim(), filenameInput.trim() || undefined);
      startDownload(id);
      setUrlInput('');
      setFilenameInput('');
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkUrlsInput.trim()) {
      const urls = bulkUrlsInput
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      if (urls.length > 0) {
        addBulkDownloads(urls);
        setBulkUrlsInput('');
        setShowBulkInput(false);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(d => d.id)));
    }
  };

  const handleBatchStart = () => {
    selectedIds.forEach(id => startDownload(id));
    setSelectedIds(new Set());
  };

  const handleBatchPause = () => {
    selectedIds.forEach(id => pauseDownload(id));
  };

  const handleBatchResume = () => {
    selectedIds.forEach(id => resumeDownload(id));
  };

  const handleBatchCancel = () => {
    selectedIds.forEach(id => cancelDownload(id));
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    selectedIds.forEach(id => removeDownload(id));
    setSelectedIds(new Set());
  };

  const handleCreateCategory = (name: string, color: string, icon: string) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name,
      color,
      icon,
      taskCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCategories([...categories, newCategory]);
  };

  const handleUpdateCategory = (id: string, name: string, color: string, icon: string) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, name, color, icon, updatedAt: Date.now() } : cat
    ));
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
    if (filters.category === Number(id)) {
      setFilters({ category: null });
    }
  };

  const handleAddTasksToCategory = (categoryId: string, taskIds: string[]) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId
        ? { ...cat, taskCount: cat.taskCount + taskIds.length, updatedAt: Date.now() }
        : cat
    ));
  };

  const handleClearCompleted = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCompleted = () => {
    clearCompleted();
    setShowClearConfirm(false);
  };

  const completedCount = downloads.filter(d => d.status === 'completed').length;
  const totalSize = downloads.reduce((sum, d) => sum + (d.totalBytes || 0), 0);

  return (
    <div className="downloads-page">
      <div className="page-header">
        <h2 className="page-title">📥 下载管理</h2>
        <p className="page-desc">添加、管理、监控您的下载任务</p>
      </div>

      <form className="url-form" onSubmit={handleUrlSubmit}>
        <input
          type="url"
          className="url-input"
          placeholder="输入下载链接..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          required
        />
        <input
          type="text"
          className="filename-input"
          placeholder="自定义文件名（可选）"
          value={filenameInput}
          onChange={(e) => setFilenameInput(e.target.value)}
        />
        <button type="submit" className="submit-btn primary">
          + 添加下载
        </button>
      </form>

      <div className="bulk-download-section">
        <button
          className="toggle-bulk-btn"
          onClick={() => setShowBulkInput(!showBulkInput)}
        >
          {showBulkInput ? '收起批量添加' : '📋 批量添加下载'}
        </button>
        
        {showBulkInput && (
          <form className="bulk-url-form" onSubmit={handleBulkSubmit}>
            <textarea
              className="bulk-url-input"
              placeholder="每行输入一个下载链接，支持批量添加..."
              value={bulkUrlsInput}
              onChange={(e) => setBulkUrlsInput(e.target.value)}
              rows={5}
            />
            <div className="bulk-form-actions">
              <button type="submit" className="submit-btn primary">
                添加全部 ({bulkUrlsInput.split('\n').filter(u => u.trim()).length})
              </button>
              <button
                type="button"
                className="submit-btn secondary"
                onClick={() => {
                  setBulkUrlsInput('');
                  setShowBulkInput(false);
                }}
              >
                取消
              </button>
            </div>
          </form>
        )}
      </div>

      <StatsPanel stats={{
        totalDownloads: downloads.length,
        completedDownloads: completedCount,
        failedDownloads: downloads.filter(d => d.status === 'error').length,
        totalSize,
        downloadedSize: downloads.reduce((sum, d) => sum + (d.downloadedBytes || 0), 0),
      }} title="下载统计" icon="📊" />

      <SearchFilter 
        onSearch={handleSearch} 
        categories={categories.map(cat => ({ id: Number(cat.id), name: cat.name, color: cat.color }))}
        searchCount={filteredCount}
        isSearching={isSearching}
        suggestions={suggestions}
        presets={presets}
        onSavePreset={(name) => savePreset(name)}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={deletePreset}
        onShare={handleShare}
        onExport={handleExport}
        onAdvancedSearch={handleAdvancedSearch}
      />

      <div className="category-manager-btn">
        <button
          className="action-btn secondary"
          onClick={() => setIsCategoryManagerOpen(true)}
          title="管理分类"
        >
          📂 分类管理
        </button>
        <button
          className="action-btn secondary"
          onClick={() => setIsScheduleManagerOpen(true)}
          title="定时任务"
        >
          ⏰ 定时任务
        </button>
        <button
          className="action-btn secondary"
          onClick={() => setIsShareManagerOpen(true)}
          title="文件分享"
        >
          🔗 文件分享
        </button>
      </div>

      <div className="action-bar">
        <div className="action-bar-left">
          {downloads.length > 0 && (
            <>
              <label className="select-all-label">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                  onChange={handleSelectAll}
                />
                <span>全选</span>
              </label>
              <span className="selected-count">
                已选择 {selectedIds.size} 项
              </span>
            </>
          )}
        </div>

        <div className="action-bar-right">
          {selectedIds.size > 0 && (
            <>
              <button className="action-btn" onClick={handleBatchStart}>
                ▶️ 批量开始
              </button>
              <button className="action-btn" onClick={handleBatchPause}>
                ⏸️ 批量暂停
              </button>
              <button className="action-btn" onClick={handleBatchResume}>
                ▶️ 批量继续
              </button>
              <button className="action-btn" onClick={handleBatchCancel}>
                ✖️ 批量取消
              </button>
              <button className="action-btn danger" onClick={handleBatchDelete}>
                🗑️ 批量删除
              </button>
            </>
          )}
          {completedCount > 0 && (
            <button className="action-btn danger" onClick={handleClearCompleted}>
              🗑️ 清空已完成
            </button>
          )}
          <button 
            className="action-btn" 
            onClick={() => setShowPerformanceTest(!showPerformanceTest)}
          >
            ⚡ 性能测试
          </button>
        </div>
      </div>

      {showPerformanceTest && (
        <div className="performance-test-container">
          <Suspense fallback={<div>加载中...</div>}>
            <PerformanceTest onAddTestItems={handleAddTestItems} />
          </Suspense>
        </div>
      )}

      {isSearching ? (
        <div className="search-loading">
          <span className="loading-spinner">🔄</span>
          <span>搜索中...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="empty-state">
          {filters.keyword || filters.type.length > 0 || filters.status.length > 0 || filters.category !== null ? (
            <>
              <span className="empty-icon">🔍</span>
              <p>未找到匹配的下载任务</p>
              <p className="empty-hint">尝试调整搜索关键词或筛选条件</p>
              <button 
                className="action-btn btn-secondary" 
                onClick={() => {
                  setFilters({
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
                }}
              >
                清除筛选
              </button>
            </>
          ) : (
            <>
              <span className="empty-icon">📭</span>
              <p>暂无下载任务</p>
              <p className="empty-hint">在上方输入框添加下载链接开始下载</p>
            </>
          )}
        </div>
      ) : (
        <Suspense fallback={<div>加载中...</div>}>
          <VirtualDownloadList
            items={paginatedDownloads}
            onStart={startDownload}
            onPause={pauseDownload}
            onResume={resumeDownload}
            onCancel={cancelDownload}
            onRemove={removeDownload}
            highlightKeyword={filters.keyword}
          />
        </Suspense>
      )}

      {!isSearching && filteredData.length > 0 && totalPages > 1 && (
        <div className="pagination-container">
          <Pagination
            current={currentPage}
            total={filteredData.length}
            pageSize={pageSize}
            onChange={setCurrentPage}
            showTotal={(total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`}
          />
        </div>
      )}

      <Suspense fallback={<div>加载中...</div>}>
        <CategoryManager
          isOpen={isCategoryManagerOpen}
          onClose={() => setIsCategoryManagerOpen(false)}
          categories={categories}
          onCreateCategory={handleCreateCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          selectedTaskIds={Array.from(selectedIds)}
          onTasksAddedToCategory={handleAddTasksToCategory}
        />
      </Suspense>

      <ConfirmationModal
        isOpen={showClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={confirmClearCompleted}
        title="清空已完成任务"
        message={`确定要清空 ${completedCount} 个已完成的任务吗？此操作不可恢复。`}
        confirmText="确认清空"
        cancelText="取消"
        type="danger"
      />

      <Suspense fallback={<div>加载中...</div>}>
        <ScheduleManager
          isOpen={isScheduleManagerOpen}
          onClose={() => setIsScheduleManagerOpen(false)}
        />
      </Suspense>

      <Suspense fallback={<div>加载中...</div>}>
        <ShareManager
          isOpen={isShareManagerOpen}
          onClose={() => setIsShareManagerOpen(false)}
        />
      </Suspense>
    </div>
  );
};

export default Downloads;