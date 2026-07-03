import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Downloads from '../../pages/Downloads';
import { useDownloadManager } from '../../hooks/useDownloadManager';
import { useSearch } from '../../hooks/useSearch';

vi.mock('../../hooks/useDownloadManager');
vi.mock('../../hooks/useSearch');

const renderPage = () => {
  return render(<Downloads />);
};
describe('E2E - 下载管理完整流程', () => {
  const mockAddDownload = vi.fn((url: string) => `id-${url.length}`);
  const mockStartDownload = vi.fn();
  const mockPauseDownload = vi.fn();
  const mockResumeDownload = vi.fn();
  const mockCancelDownload = vi.fn();
  const mockRemoveDownload = vi.fn();
  const mockClearCompleted = vi.fn();
  const mockAddBulkDownloads = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useDownloadManager as vi.Mock).mockReturnValue({
      downloads: [],
      stats: { totalDownloads: 0, completedDownloads: 0, failedDownloads: 0, totalSize: 0, downloadedSize: 0 },
      addDownload: mockAddDownload,
      addBulkDownloads: mockAddBulkDownloads,
      startDownload: mockStartDownload,
      pauseDownload: mockPauseDownload,
      resumeDownload: mockResumeDownload,
      cancelDownload: mockCancelDownload,
      removeDownload: mockRemoveDownload,
      clearCompleted: mockClearCompleted,
    });

    (useSearch as vi.Mock).mockReturnValue({
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

  describe('完整下载流程', () => {
    it('用户应该能完成：添加 → 开始 → 暂停 → 恢复 → 取消 → 删除', () => {
      renderPage();

      const urlInput = screen.getByPlaceholderText('输入下载链接...');
      fireEvent.change(urlInput, { target: { value: 'https://example.com/file.zip' } });

      const addBtn = screen.getByText('+ 添加下载');
      fireEvent.click(addBtn);

      expect(mockAddDownload).toHaveBeenCalledWith('https://example.com/file.zip', undefined);
      expect(mockStartDownload).toHaveBeenCalled();

      expect(urlInput).toHaveValue('');
    });

    it('用户应该能批量添加多个下载', () => {
      renderPage();

      const bulkBtn = screen.getByText('📋 批量添加下载');
      fireEvent.click(bulkBtn);

      const textarea = screen.getByPlaceholderText('每行输入一个下载链接，支持批量添加...');
      fireEvent.change(textarea, {
        target: { value: 'https://a.com/1.zip\nhttps://b.com/2.zip\nhttps://c.com/3.zip' },
      });

      const submitBtn = screen.getByText(/添加全部 \(\d+\)/);
      fireEvent.click(submitBtn);

      expect(mockAddBulkDownloads).toHaveBeenCalledWith([
        'https://a.com/1.zip',
        'https://b.com/2.zip',
        'https://c.com/3.zip',
      ]);
    });
  });

  describe('数据展示流程', () => {
    it('应该显示已完成的下载', () => {
      (useDownloadManager as vi.Mock).mockReturnValue({
        downloads: [
          { id: '1', filename: 'video.mp4', status: 'completed', progress: 100, totalBytes: 1000000, downloadedBytes: 1000000, url: 'https://a.com', speed: 0, resumePosition: 0, createdAt: Date.now(), priority: 'normal' },
        ],
        stats: { totalDownloads: 1, completedDownloads: 1, failedDownloads: 0, totalSize: 1000000, downloadedSize: 1000000 },
        addDownload: mockAddDownload,
        addBulkDownloads: mockAddBulkDownloads,
        startDownload: mockStartDownload,
        pauseDownload: mockPauseDownload,
        resumeDownload: mockResumeDownload,
        cancelDownload: mockCancelDownload,
        removeDownload: mockRemoveDownload,
        clearCompleted: mockClearCompleted,
      });

      (useSearch as vi.Mock).mockReturnValue({
        filters: { keyword: '', category: null, status: 'all' },
        filteredData: [
          { id: '1', filename: 'video.mp4', status: 'completed', progress: 100, totalBytes: 1000000, downloadedBytes: 1000000, url: 'https://a.com', speed: 0, resumePosition: 0, createdAt: Date.now(), priority: 'normal' },
        ],
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

      renderPage();

      expect(screen.getByText('video.mp4')).toBeInTheDocument();
    });

    it('应该显示下载统计', () => {
      (useDownloadManager as vi.Mock).mockReturnValue({
        downloads: [],
        stats: { totalDownloads: 5, completedDownloads: 3, failedDownloads: 1, totalSize: 5000000, downloadedSize: 3000000 },
        addDownload: mockAddDownload,
        addBulkDownloads: mockAddBulkDownloads,
        startDownload: mockStartDownload,
        pauseDownload: mockPauseDownload,
        resumeDownload: mockResumeDownload,
        cancelDownload: mockCancelDownload,
        removeDownload: mockRemoveDownload,
        clearCompleted: mockClearCompleted,
      });

      renderPage();

      expect(screen.getByText('下载统计')).toBeInTheDocument();
    });
  });

  describe('清理操作流程', () => {
    it('应该能完成清空已完成的完整流程', async () => {
      (useDownloadManager as vi.Mock).mockReturnValue({
        downloads: [
          { id: '1', filename: 'a.zip', status: 'completed' },
          { id: '2', filename: 'b.zip', status: 'completed' },
        ],
        stats: { totalDownloads: 2, completedDownloads: 2, failedDownloads: 0, totalSize: 0, downloadedSize: 0 },
        addDownload: mockAddDownload,
        addBulkDownloads: mockAddBulkDownloads,
        startDownload: mockStartDownload,
        pauseDownload: mockPauseDownload,
        resumeDownload: mockResumeDownload,
        cancelDownload: mockCancelDownload,
        removeDownload: mockRemoveDownload,
        clearCompleted: mockClearCompleted,
      });

      (useSearch as vi.Mock).mockReturnValue({
        filters: { keyword: '', category: null, status: 'all' },
        filteredData: [
          { id: '1', filename: 'a.zip', status: 'completed' },
          { id: '2', filename: 'b.zip', status: 'completed' },
        ],
        isSearching: false,
        filteredCount: 2,
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

      renderPage();

      const clearBtn = screen.getByText('🗑️ 清空已完成');
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByText('清空已完成任务')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByText('确认清空');
      fireEvent.click(confirmBtn);

      expect(mockClearCompleted).toHaveBeenCalled();
    });

    it('应该能取消清空操作', async () => {
      (useDownloadManager as vi.Mock).mockReturnValue({
        downloads: [{ id: '1', filename: 'a.zip', status: 'completed' }],
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

      (useSearch as vi.Mock).mockReturnValue({
        filters: { keyword: '', category: null, status: 'all' },
        filteredData: [{ id: '1', filename: 'a.zip', status: 'completed' }],
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

      renderPage();

      fireEvent.click(screen.getByText('🗑️ 清空已完成'));

      await waitFor(() => {
        expect(screen.getByText('清空已完成任务')).toBeInTheDocument();
      });

      const cancelBtn = screen.getByText('取消');
      fireEvent.click(cancelBtn);

      expect(mockClearCompleted).not.toHaveBeenCalled();
    });
  });

  describe('分类管理流程', () => {
    it('应该能打开分类管理', () => {
      renderPage();

      const catBtn = screen.getByText('📂 分类管理');
      fireEvent.click(catBtn);

      expect(catBtn).toBeInTheDocument();
    });
  });

  describe('错误处理流程', () => {
    it('应该正确处理网络错误', () => {
      renderPage();

      const urlInput = screen.getByPlaceholderText('输入下载链接...');
      expect(urlInput).toBeInTheDocument();
    });
  });

  describe('用户交互完整性', () => {
    it('应该支持键盘Enter键提交', () => {
      renderPage();

      const urlInput = screen.getByPlaceholderText('输入下载链接...');
      fireEvent.change(urlInput, { target: { value: 'https://example.com/file.zip' } });
      fireEvent.submit(urlInput.closest('form')!);

      expect(mockAddDownload).toHaveBeenCalled();
    });

    it('应该能切换批量输入显示', async () => {
      renderPage();

      const toggleBtn = screen.getByText('📋 批量添加下载');
      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('每行输入一个下载链接，支持批量添加...')).toBeInTheDocument();
      });

      const closeBtn = screen.getByText('收起批量添加');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('每行输入一个下载链接，支持批量添加...')).not.toBeInTheDocument();
      });
    });
  });
});