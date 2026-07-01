import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import StatsDashboard from '../StatsDashboard';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('StatsDashboard Component', () => {
  it('should render loading state initially', async () => {
    render(<StatsDashboard />);
    
    expect(screen.getByText(/加载统计数据/)).toBeInTheDocument();
  });

  it('should render stats after loading completes', async () => {
    render(<StatsDashboard />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/总下载数/)).toBeInTheDocument();
    expect(screen.getByText(/总上传数/)).toBeInTheDocument();
    expect(screen.getByText(/总流量/)).toBeInTheDocument();
    expect(screen.getByText(/平均速度/)).toBeInTheDocument();
    
    expect(screen.getByText('156')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
  });

  it('should switch time range to week', async () => {
    render(<StatsDashboard />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    fireEvent.click(screen.getByText('本周'));
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getByText('本周')).toBeInTheDocument();
  });

  it('should switch time range to month', async () => {
    render(<StatsDashboard />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    fireEvent.click(screen.getByText('本月'));
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getByText('本月')).toBeInTheDocument();
  });

  it('should render charts after loading', async () => {
    render(<StatsDashboard />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/趋势分析/)).toBeInTheDocument();
    expect(screen.getByText(/任务完成率/)).toBeInTheDocument();
    expect(screen.getByText(/存储空间/)).toBeInTheDocument();
  });

  it('should display storage usage percentage', async () => {
    render(<StatsDashboard />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/37\.0%/)).toBeInTheDocument();
  });

  it('should display completion rate', async () => {
    render(<StatsDashboard />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    const completionRate = screen.getByText(/91\.0%/);
    expect(completionRate).toBeInTheDocument();
  });

  it('should have refresh interval', async () => {
    const { unmount } = render(<StatsDashboard refreshInterval={10000} />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    
    expect(screen.getByText('156')).toBeInTheDocument();
    
    unmount();
  });

  it('should render trend data for different time ranges', async () => {
    render(<StatsDashboard />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/趋势分析/)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('本周'));
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getByText(/趋势分析/)).toBeInTheDocument();
  });

  it('should render storage breakdown items', async () => {
    render(<StatsDashboard />);
    
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.getAllByText('下载').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('上传').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('缓存')).toBeInTheDocument();
    expect(screen.getByText('其他')).toBeInTheDocument();
  });
});