import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Uploads from '../../pages/Uploads';
import { useUploadManager } from '../../hooks/useUploadManager';

jest.mock('../../hooks/useUploadManager');

const renderPage = () => {
  return render(<Uploads />);
};

describe('E2E - 上传管理完整流程', () => {
  const mockAddUpload = jest.fn();
  const mockStartUpload = jest.fn();
  const mockPauseUpload = jest.fn();
  const mockResumeUpload = jest.fn();
  const mockCancelUpload = jest.fn();
  const mockRemoveUpload = jest.fn();
  const mockClearCompleted = jest.fn();
  const mockStartAllUploads = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useUploadManager as jest.Mock).mockReturnValue({
      uploads: [],
      stats: { totalUploads: 0, completedUploads: 0, failedUploads: 0, totalSize: 0, uploadedSize: 0 },
      addUpload: mockAddUpload,
      startUpload: mockStartUpload,
      pauseUpload: mockPauseUpload,
      resumeUpload: mockResumeUpload,
      cancelUpload: mockCancelUpload,
      removeUpload: mockRemoveUpload,
      clearCompleted: mockClearCompleted,
      startAllUploads: mockStartAllUploads,
    });
  });

  describe('页面渲染', () => {
    it('应该正确渲染上传页面', () => {
      renderPage();
      expect(screen.getByText('📤 上传管理')).toBeInTheDocument();
    });

    it('应该显示拖拽区域', () => {
      renderPage();
      expect(screen.getByText('点击或拖拽文件到这里上传')).toBeInTheDocument();
    });
  });

  describe('文件选择流程', () => {
    it('应该能通过文件选择器上传文件', () => {
      renderPage();

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockAddUpload).toHaveBeenCalled();
    });

    it('应该支持多文件上传', () => {
      renderPage();

      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file1, file2] } });

      expect(mockAddUpload).toHaveBeenCalled();
    });
  });

  describe('拖拽上传流程', () => {
    it('应该支持拖拽上传', () => {
      renderPage();

      const dropZone = document.querySelector('.upload-drop-zone') as HTMLElement;
      const file = new File(['content'], 'dragged.txt', { type: 'text/plain' });

      const dataTransfer = {
        files: [file],
        items: [],
        types: ['Files'],
      };

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });
      Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });

      fireEvent(dropZone, dropEvent);

      expect(mockAddUpload).toHaveBeenCalled();
    });
  });

  describe('批量操作流程', () => {
    it('应该能全部开始上传', () => {
      (useUploadManager as jest.Mock).mockReturnValue({
        uploads: [
          { id: '1', filename: 'a.txt', status: 'pending' },
          { id: '2', filename: 'b.txt', status: 'pending' },
        ],
        stats: { totalUploads: 2, completedUploads: 0, failedUploads: 0, totalSize: 0, uploadedSize: 0 },
        addUpload: mockAddUpload,
        startUpload: mockStartUpload,
        pauseUpload: mockPauseUpload,
        resumeUpload: mockResumeUpload,
        cancelUpload: mockCancelUpload,
        removeUpload: mockRemoveUpload,
        clearCompleted: mockClearCompleted,
        startAllUploads: mockStartAllUploads,
      });

      renderPage();

      const startAllBtn = screen.getByText('▶ 全部开始');
      fireEvent.click(startAllBtn);

      expect(mockStartAllUploads).toHaveBeenCalled();
    });

    it('应该能清空已完成', () => {
      (useUploadManager as jest.Mock).mockReturnValue({
        uploads: [
          { id: '1', filename: 'a.txt', status: 'completed' },
          { id: '2', filename: 'b.txt', status: 'completed' },
        ],
        stats: { totalUploads: 2, completedUploads: 2, failedUploads: 0, totalSize: 0, uploadedSize: 0 },
        addUpload: mockAddUpload,
        startUpload: mockStartUpload,
        pauseUpload: mockPauseUpload,
        resumeUpload: mockResumeUpload,
        cancelUpload: mockCancelUpload,
        removeUpload: mockRemoveUpload,
        clearCompleted: mockClearCompleted,
        startAllUploads: mockStartAllUploads,
      });

      renderPage();

      const clearBtn = screen.getByText('🗑 清空已完成');
      fireEvent.click(clearBtn);

      expect(mockClearCompleted).toHaveBeenCalled();
    });
  });

  describe('统计显示', () => {
    it('应该显示上传统计', () => {
      (useUploadManager as jest.Mock).mockReturnValue({
        uploads: [],
        stats: { totalUploads: 5, completedUploads: 3, failedUploads: 1, totalSize: 5000000, uploadedSize: 3000000 },
        addUpload: mockAddUpload,
        startUpload: mockStartUpload,
        pauseUpload: mockPauseUpload,
        resumeUpload: mockResumeUpload,
        cancelUpload: mockCancelUpload,
        removeUpload: mockRemoveUpload,
        clearCompleted: mockClearCompleted,
        startAllUploads: mockStartAllUploads,
      });

      renderPage();

      expect(screen.getByText('上传统计')).toBeInTheDocument();
    });
  });

  describe('空状态', () => {
    it('应该在没有上传任务时显示空状态', () => {
      renderPage();
      expect(screen.getByText('点击或拖拽文件到这里上传')).toBeInTheDocument();
    });
  });
});
