import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import StatsDashboard from '../StatsDashboard';

const mockStatsResponse = {
  success: true,
  data: {
    downloads: {
      total: 156,
      completed: 142,
      totalBytes: 2.5 * 1024 * 1024 * 1024,
      completionRate: 91,
    },
    uploads: {
      total: 89,
      completed: 85,
      totalBytes: 1.2 * 1024 * 1024 * 1024,
      completionRate: 96,
    },
    shares: {
      total: 5,
    },
    storage: {
      used: 3.7 * 1024 * 1024 * 1024,
      total: 10 * 1024 * 1024 * 1024,
    },
  },
};

const mockTrendResponse = {
  success: true,
  data: [
    { date: '6/28', downloads: 10, uploads: 5 },
    { date: '6/29', downloads: 15, uploads: 8 },
    { date: '6/30', downloads: 8, uploads: 12 },
    { date: '7/1', downloads: 20, uploads: 6 },
    { date: '7/2', downloads: 12, uploads: 9 },
    { date: '7/3', downloads: 18, uploads: 11 },
    { date: '7/4', downloads: 25, uploads: 15 },
  ],
};

const mockFileTypeResponse = {
  success: true,
  data: [
    { type: 'image', name: '图片', count: 50, totalSize: 1 * 1024 * 1024 * 1024, color: '#3b82f6' },
    { type: 'document', name: '文档', count: 30, totalSize: 500 * 1024 * 1024, color: '#f59e0b' },
    { type: 'video', name: '视频', count: 15, totalSize: 2 * 1024 * 1024 * 1024, color: '#ef4444' },
  ],
};

const mockActivitiesResponse = {
  success: true,
  data: [
    { id: 1, type: 'download', filename: 'test.zip', status: 'completed', createdAt: '2024-07-03T10:00:00Z', size: 100 * 1024 * 1024 },
    { id: 2, type: 'upload', filename: 'document.pdf', status: 'completed', createdAt: '2024-07-03T09:00:00Z', size: 5 * 1024 * 1024 },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const setupFetchMock = () => {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes('/stats') && !url.includes('trend') && !url.includes('file-types') && !url.includes('activities')) {
      return Promise.resolve({ json: () => Promise.resolve(mockStatsResponse) });
    }
    if (url.includes('/stats/trend')) {
      return Promise.resolve({ json: () => Promise.resolve(mockTrendResponse) });
    }
    if (url.includes('/stats/file-types')) {
      return Promise.resolve({ json: () => Promise.resolve(mockFileTypeResponse) });
    }
    if (url.includes('/stats/activities')) {
      return Promise.resolve({ json: () => Promise.resolve(mockActivitiesResponse) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
};

describe('StatsDashboard Component', () => {
  it('should render loading state initially', async () => {
    render(<StatsDashboard />);
    
    expect(screen.getByText(/加载统计数据/)).toBeInTheDocument();
  });

  it('should render stats after loading completes', async () => {
    setupFetchMock();
    render(<StatsDashboard />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/总下载数/)).toBeInTheDocument();
    expect(screen.getByText(/总上传数/)).toBeInTheDocument();
    expect(screen.getByText(/分享链接/)).toBeInTheDocument();
    expect(screen.getByText(/总流量/)).toBeInTheDocument();
  });

  it('should switch time range to week', async () => {
    setupFetchMock();
    render(<StatsDashboard />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    fireEvent.click(screen.getByText('本周'));
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getByText('本周')).toBeInTheDocument();
  });

  it('should switch time range to month', async () => {
    setupFetchMock();
    render(<StatsDashboard />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    fireEvent.click(screen.getByText('本月'));
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getByText('本月')).toBeInTheDocument();
  });

  it('should render charts after loading', async () => {
    setupFetchMock();
    render(<StatsDashboard />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/趋势分析/)).toBeInTheDocument();
    expect(screen.getByText(/任务完成率/)).toBeInTheDocument();
    expect(screen.getByText(/存储空间/)).toBeInTheDocument();
    expect(screen.getByText(/文件类型分布/)).toBeInTheDocument();
    expect(screen.getByText(/最近活动/)).toBeInTheDocument();
  });

  it('should display completion rate', async () => {
    setupFetchMock();
    render(<StatsDashboard />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    const completionRate = screen.getByText(/91\.0%/);
    expect(completionRate).toBeInTheDocument();
  });

  it('should have refresh interval', async () => {
    setupFetchMock();
    const { unmount } = render(<StatsDashboard refreshInterval={10000} />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    
    expect(screen.getByText(/总下载数/)).toBeInTheDocument();
    
    unmount();
  });

  it('should render trend data for different time ranges', async () => {
    setupFetchMock();
    render(<StatsDashboard />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/趋势分析/)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('本周'));
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/趋势分析/)).toBeInTheDocument();
  });

  it('should render storage breakdown items', async () => {
    setupFetchMock();
    render(<StatsDashboard />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getAllByText('下载').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('上传').length).toBeGreaterThanOrEqual(1);
  });

  it('should handle error state', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<StatsDashboard />);
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/加载统计数据失败/)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('重试'));
    
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/加载统计数据失败/)).toBeInTheDocument();
  });
});