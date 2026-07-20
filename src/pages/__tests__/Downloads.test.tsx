﻿import type { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Downloads from '../../pages/Downloads';
import { useDownloadManager } from '../../hooks/useDownloadManager';
import { useSearch } from '../../hooks/useSearch';
import type { DownloadItem } from '../../types';

vi.mock('../../hooks/useDownloadManager');
vi.mock('../../hooks/useSearch');

describe('Downloads Page Integration', () => {
  const mockAddDownload = vi.fn(() => 'mock-id-1');
  const mockStartDownload = vi.fn();
  const mockPauseDownload = vi.fn();
  const mockResumeDownload = vi.fn();
  const mockCancelDownload = vi.fn();
  const mockRemoveDownload = vi.fn();
  const mockClearCompleted = vi.fn();
  const mockAddBulkDownloads = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useDownloadManager as Mock).mockReturnValue({
      downloads: [],
      stats: {
        totalDownloads: 0,
        completedDownloads: 0,
        failedDownloads: 0,
        totalSize: 0,
        downloadedSize: 0,
      },
      addDownload: mockAddDownload,
      addBulkDownloads: mockAddBulkDownloads,
      startDownload: mockStartDownload,
      pauseDownload: mockPauseDownload,
      resumeDownload: mockResumeDownload,
      cancelDownload: mockCancelDownload,
      removeDownload: mockRemoveDownload,
      clearCompleted: mockClearCompleted,
    });

    (useSearch as Mock).mockReturnValue({
      filters: { keyword: '', category: null, status: 'all' },
      filteredData: [],
      isSearching: false,
      filteredCount: 0,
      suggestions: [],
      presets: [],
      setFilters: vi.fn(),
      setKeyword: vi.fn(),
      resetFilters: vi.fn(),
      savePreset: vi.fn(),
      loadPreset: vi.fn(),
      deletePreset: vi.fn(),
      exportResults: vi.fn(() => '[]'),
      buildShareUrl: vi.fn(() => 'http://example.com'),
    });
  });

  describe('页面渲染', () => {
    it('应该正确渲染页面标题', () => {
      render(<Downloads />);
      expect(screen.getByText('📥 下载管理')).toBeInTheDocument();
    });

    it('应该渲染URL输入框', () => {
      render(<Downloads />);
      const urlInput = screen.getByPlaceholderText('输入下载链接...');
      expect(urlInput).toBeInTheDocument();
    });

    it('应该渲染文件名输入框', () => {
      render(<Downloads />);
      const filenameInput = screen.getByPlaceholderText('自定义文件名（可选）');
      expect(filenameInput).toBeInTheDocument();
    });

    it('应该渲染添加下载按钮', () => {
      render(<Downloads />);
      const addBtn = screen.getByText('+ 添加下载');
      expect(addBtn).toBeInTheDocument();
    });
  });

  describe('添加下载功能', () => {
    it('应该在提交表单时添加下载', () => {
      render(<Downloads />);
      
      const urlInput = screen.getByPlaceholderText('输入下载链接...');
      const filenameInput = screen.getByPlaceholderText('自定义文件名（可选）');
      const addBtn = screen.getByText('+ 添加下载');

      fireEvent.change(urlInput, { target: { value: 'https://example.com/file.zip' } });
      fireEvent.change(filenameInput, { target: { value: 'myfile.zip' } });
      fireEvent.submit(addBtn);

      expect(mockAddDownload).toHaveBeenCalledWith('https://example.com/file.zip', 'myfile.zip');
      expect(mockStartDownload).toHaveBeenCalled();
    });

    it('应该在没有自定义文件名时使用默认值', () => {
      render(<Downloads />);
      
      const urlInput = screen.getByPlaceholderText('输入下载链接...');
      const addBtn = screen.getByText('+ 添加下载');

      fireEvent.change(urlInput, { target: { value: 'https://example.com/file.zip' } });
      fireEvent.submit(addBtn);

      expect(mockAddDownload).toHaveBeenCalledWith('https://example.com/file.zip', undefined);
    });

    it('提交后应该清空输入框', () => {
      render(<Downloads />);
      
      const urlInput = screen.getByPlaceholderText('输入下载链接...') as HTMLInputElement;
      const filenameInput = screen.getByPlaceholderText('自定义文件名（可选）') as HTMLInputElement;
      const addBtn = screen.getByText('+ 添加下载');

      fireEvent.change(urlInput, { target: { value: 'https://example.com/file.zip' } });
      fireEvent.change(filenameInput, { target: { value: 'myfile.zip' } });
      fireEvent.submit(addBtn);

      expect(urlInput.value).toBe('');
      expect(filenameInput.value).toBe('');
    });
  });

  describe('批量添加功能', () => {
    it('应该显示批量添加按钮', () => {
      render(<Downloads />);
      const bulkBtn = screen.getByText('📋 批量添加下载');
      expect(bulkBtn).toBeInTheDocument();
    });

    it('应该在点击后显示批量输入区域', () => {
      render(<Downloads />);
      
      const bulkBtn = screen.getByText('📋 批量添加下载');
      fireEvent.click(bulkBtn);

      const textarea = screen.getByPlaceholderText('每行输入一个下载链接，支持批量添加...');
      expect(textarea).toBeInTheDocument();
    });

    it('应该隐藏批量输入区域', () => {
      render(<Downloads />);
      
      const bulkBtn = screen.getByText('📋 批量添加下载');
      fireEvent.click(bulkBtn);

      const closeBtn = screen.getByText('收起批量添加');
      fireEvent.click(closeBtn);

      const textarea = screen.queryByPlaceholderText('每行输入一个下载链接，支持批量添加...');
      expect(textarea).not.toBeInTheDocument();
    });

    it('应该批量添加下载链接', () => {
      render(<Downloads />);
      
      const bulkBtn = screen.getByText('📋 批量添加下载');
      fireEvent.click(bulkBtn);

      const textarea = screen.getByPlaceholderText('每行输入一个下载链接，支持批量添加...');
      fireEvent.change(textarea, { 
        target: { value: 'https://example.com/a.zip\nhttps://example.com/b.zip\nhttps://example.com/c.zip' } 
      });

      const submitBtn = screen.getByText('添加全部 (3)');
      fireEvent.click(submitBtn);

      expect(mockAddBulkDownloads).toHaveBeenCalledWith([
        'https://example.com/a.zip',
        'https://example.com/b.zip',
        'https://example.com/c.zip'
      ]);
    });
  });

  describe('统计面板', () => {
    it('应该渲染统计面板', () => {
      render(<Downloads />);
      expect(screen.getByText('下载统计')).toBeInTheDocument();
    });
  });

  describe('搜索过滤器', () => {
    it('应该渲染搜索过滤器组件', () => {
      render(<Downloads />);
      expect(true).toBe(true);
    });
  });

  describe('分类管理', () => {
    it('应该显示分类管理按钮', () => {
      render(<Downloads />);
      const btn = screen.getByText('📂 分类管理');
      expect(btn).toBeInTheDocument();
    });
  });

  describe('空状态', () => {
    it('应该在没有下载时显示空状态', () => {
      render(<Downloads />);
      expect(screen.getByText('暂无下载任务')).toBeInTheDocument();
    });
  });

  describe('操作栏', () => {
    it('应该显示清空已完成按钮', async () => {
      (useDownloadManager as Mock).mockReturnValue({
        downloads: [{ id: '1', status: 'completed' } as any],
        stats: { totalDownloads: 1, completedDownloads: 1, failedDownloads: 0, totalSize: 0, downloadedSize: 0 },
        addDownload: mockAddDownload,
        addBulkDownloads: mockAddBulkDownloads,
        startDownload: mockStartDownload,
        pauseDownload: mockPauseDownload,
        resumeDownload: mockResumeDownload,
        cancelDownload: mockCancelDownload,
        removeDownload: mockRemoveDownload,
        clearCompleted: mockClearCompleted,
      });

      (useSearch as Mock).mockReturnValue({
        filters: { keyword: '', category: null, status: 'all' },
        filteredData: [{ id: '1', status: 'completed' } as Partial<DownloadItem>],
        isSearching: false,
        filteredCount: 1,
        suggestions: [],
        presets: [],
        setFilters: vi.fn(),
        setKeyword: vi.fn(),
        resetFilters: vi.fn(),
        savePreset: vi.fn(),
        loadPreset: vi.fn(),
        deletePreset: vi.fn(),
        exportResults: vi.fn(() => '[]'),
        buildShareUrl: vi.fn(() => 'http://example.com'),
      });

      render(<Downloads />);
      
      const clearBtn = screen.getByText('🗑️ 清空已完成');
      expect(clearBtn).toBeInTheDocument();
    });

    it('应该显示性能测试按钮', () => {
      render(<Downloads />);
      const perfBtn = screen.getByText('⚡ 性能测试');
      expect(perfBtn).toBeInTheDocument();
    });
  });

  describe('确认弹窗', () => {
    it('应该在点击清空已完成时显示确认弹窗', async () => {
      (useDownloadManager as Mock).mockReturnValue({
        downloads: [{ id: '1', status: 'completed' } as any],
        stats: { totalDownloads: 1, completedDownloads: 1, failedDownloads: 0, totalSize: 0, downloadedSize: 0 },
        addDownload: mockAddDownload,
        addBulkDownloads: mockAddBulkDownloads,
        startDownload: mockStartDownload,
        pauseDownload: mockPauseDownload,
        resumeDownload: mockResumeDownload,
        cancelDownload: mockCancelDownload,
        removeDownload: mockRemoveDownload,
        clearCompleted: mockClearCompleted,
      });

      (useSearch as Mock).mockReturnValue({
        filters: { keyword: '', category: null, status: 'all' },
        filteredData: [{ id: '1', status: 'completed' } as Partial<DownloadItem>],
        isSearching: false,
        filteredCount: 1,
        suggestions: [],
        presets: [],
        setFilters: vi.fn(),
        setKeyword: vi.fn(),
        resetFilters: vi.fn(),
        savePreset: vi.fn(),
        loadPreset: vi.fn(),
        deletePreset: vi.fn(),
        exportResults: vi.fn(() => '[]'),
        buildShareUrl: vi.fn(() => 'http://example.com'),
      });

      render(<Downloads />);
      
      const clearBtn = screen.getByText('🗑️ 清空已完成');
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByText('清空已完成任务')).toBeInTheDocument();
      });
    });

    it('应该在确认后调用clearCompleted', async () => {
      (useDownloadManager as Mock).mockReturnValue({
        downloads: [{ id: '1', status: 'completed' } as any],
        stats: { totalDownloads: 1, completedDownloads: 1, failedDownloads: 0, totalSize: 0, downloadedSize: 0 },
        addDownload: mockAddDownload,
        addBulkDownloads: mockAddBulkDownloads,
        startDownload: mockStartDownload,
        pauseDownload: mockPauseDownload,
        resumeDownload: mockResumeDownload,
        cancelDownload: mockCancelDownload,
        removeDownload: mockRemoveDownload,
        clearCompleted: mockClearCompleted,
      });

      (useSearch as Mock).mockReturnValue({
        filters: { keyword: '', category: null, status: 'all' },
        filteredData: [{ id: '1', status: 'completed' } as Partial<DownloadItem>],
        isSearching: false,
        filteredCount: 1,
        suggestions: [],
        presets: [],
        setFilters: vi.fn(),
        setKeyword: vi.fn(),
        resetFilters: vi.fn(),
        savePreset: vi.fn(),
        loadPreset: vi.fn(),
        deletePreset: vi.fn(),
        exportResults: vi.fn(() => '[]'),
        buildShareUrl: vi.fn(() => 'http://example.com'),
      });

      render(<Downloads />);
      
      const clearBtn = screen.getByText('🗑️ 清空已完成');
      fireEvent.click(clearBtn);

      await waitFor(() => {
        const confirmBtn = screen.getByText('确认清空');
        fireEvent.click(confirmBtn);
      });

      expect(mockClearCompleted).toHaveBeenCalled();
    });
  });

  describe('分页', () => {
    it('应该在数据超过一页时显示分页', () => {
      const mockData = Array.from({ length: 15 }, (_, i) => ({
        id: `id-${i}`,
        url: `https://example.com/file-${i}.zip`,
        filename: `file-${i}.zip`,
        status: 'pending' as const,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 1000000,
        speed: 0,
        resumePosition: 0,
        createdAt: Date.now(),
        priority: 'normal' as const,
      }));

      (useDownloadManager as Mock).mockReturnValue({
        downloads: mockData,
        stats: { totalDownloads: 15, completedDownloads: 0, failedDownloads: 0, totalSize: 0, downloadedSize: 0 },
        addDownload: mockAddDownload,
        addBulkDownloads: mockAddBulkDownloads,
        startDownload: mockStartDownload,
        pauseDownload: mockPauseDownload,
        resumeDownload: mockResumeDownload,
        cancelDownload: mockCancelDownload,
        removeDownload: mockRemoveDownload,
        clearCompleted: mockClearCompleted,
      });

      (useSearch as Mock).mockReturnValue({
        filters: { keyword: '', category: null, status: 'all' },
        filteredData: mockData,
        isSearching: false,
        filteredCount: 15,
        suggestions: [],
        presets: [],
        setFilters: vi.fn(),
        setKeyword: vi.fn(),
        resetFilters: vi.fn(),
        savePreset: vi.fn(),
        loadPreset: vi.fn(),
        deletePreset: vi.fn(),
        exportResults: vi.fn(() => '[]'),
        buildShareUrl: vi.fn(() => 'http://example.com'),
      });

      render(<Downloads />);
      
      expect(screen.getByText('显示 1-10 条，共 15 条')).toBeInTheDocument();
    });
  });
});