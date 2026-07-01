import { render, screen, fireEvent } from '@testing-library/react';
import DownloadItem from '../DownloadItem';
import { DownloadItem as DownloadItemType } from '../../types';

describe('DownloadItem Component', () => {
  const mockOnStart = jest.fn();
  const mockOnPause = jest.fn();
  const mockOnResume = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnRemove = jest.fn();

  const createMockItem = (status: DownloadItemType['status'], overrides?: Partial<DownloadItemType>): DownloadItemType => ({
    id: 'test-id',
    url: 'http://example.com/file.zip',
    filename: 'test_file.zip',
    status,
    downloadedBytes: status === 'downloading' ? 500000 : 0,
    totalBytes: 1000000,
    progress: status === 'downloading' ? 50 : 0,
    speed: status === 'downloading' ? 100000 : 0,
    priority: 'normal',
    error: status === 'error' ? '网络连接失败' : undefined,
    createdAt: Date.now(),
    resumePosition: 0,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic information', () => {
    const item = createMockItem('pending');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText('test_file.zip')).toBeInTheDocument();
    expect(screen.getByText('等待下载')).toBeInTheDocument();
  });

  it('should show start button for pending status', () => {
    const item = createMockItem('pending');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const startButton = screen.getByText('▶ 开始');
    fireEvent.click(startButton);
    
    expect(mockOnStart).toHaveBeenCalledWith('test-id');
  });

  it('should show pause and cancel buttons for downloading status', () => {
    const item = createMockItem('downloading');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const pauseButton = screen.getByText('⏸ 暂停');
    const cancelButton = screen.getByText('✕ 取消');
    
    fireEvent.click(pauseButton);
    expect(mockOnPause).toHaveBeenCalledWith('test-id');
    
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledWith('test-id');
  });

  it('should show progress bar for downloading status', () => {
    const item = createMockItem('downloading');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText('下载中')).toBeInTheDocument();
  });

  it('should show resume and cancel buttons for paused status', () => {
    const item = createMockItem('paused');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const resumeButton = screen.getByText('▶ 继续');
    const cancelButton = screen.getByText('✕ 取消');
    
    fireEvent.click(resumeButton);
    expect(mockOnResume).toHaveBeenCalledWith('test-id');
    
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledWith('test-id');
  });

  it('should show remove button for completed status', () => {
    const item = createMockItem('completed');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const removeButton = screen.getByText('🗑 删除');
    fireEvent.click(removeButton);
    
    expect(mockOnRemove).toHaveBeenCalledWith('test-id');
  });

  it('should show remove button for cancelled status', () => {
    const item = createMockItem('cancelled');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const removeButton = screen.getByText('🗑 删除');
    fireEvent.click(removeButton);
    
    expect(mockOnRemove).toHaveBeenCalledWith('test-id');
  });

  it('should show retry and remove buttons for error status', () => {
    const item = createMockItem('error');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const retryButton = screen.getByText('🔄 重试');
    const removeButton = screen.getByText('🗑 删除');
    
    fireEvent.click(retryButton);
    expect(mockOnResume).toHaveBeenCalledWith('test-id');
    
    fireEvent.click(removeButton);
    expect(mockOnRemove).toHaveBeenCalledWith('test-id');
  });

  it('should display error message for error status', () => {
    const item = createMockItem('error');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const errorDiv = document.querySelector('.download-error');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toContain('网络连接失败');
  });

  it('should highlight keyword in filename', () => {
    const item = createMockItem('pending');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
        highlightKeyword="test"
      />
    );

    const filenameElement = document.querySelector('.download-filename');
    expect(filenameElement).not.toBeNull();
    expect(filenameElement?.innerHTML).toContain('<mark');
  });

  it('should display file size information', () => {
    const item = createMockItem('downloading');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const sizeElement = document.querySelector('.download-size');
    expect(sizeElement).not.toBeNull();
    expect(sizeElement?.textContent).toContain('488.28 KB');
  });

  it('should display download speed for downloading status', () => {
    const item = createMockItem('downloading');
    
    render(
      <DownloadItem
        item={item}
        onStart={mockOnStart}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onCancel={mockOnCancel}
        onRemove={mockOnRemove}
      />
    );

    const speedElement = document.querySelector('.download-speed');
    expect(speedElement).not.toBeNull();
    expect(speedElement?.textContent).toContain('⚡');
  });
});