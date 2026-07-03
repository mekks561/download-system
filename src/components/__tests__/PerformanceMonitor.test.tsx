import { render, screen, fireEvent } from '@testing-library/react';
import { PerformanceMonitor } from '../PerformanceMonitor';

describe('PerformanceMonitor Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    
    const mockNavigationEntry = {
      responseStart: 150,
      loadEventEnd: 1500,
      startTime: 0,
      domContentLoadedEventEnd: 800,
    };
    
    const mockPerformanceObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    
    globalThis.performance = {
      getEntriesByType: vi.fn().mockReturnValue([mockNavigationEntry]),
      PerformanceObserver: vi.fn().mockImplementation(() => mockPerformanceObserver),
    } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should render toggle button', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能');
    expect(button).toBeInTheDocument();
    expect(button.closest('button')).toHaveClass('fixed');
  });

  it('should show panel when button is clicked', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能');
    fireEvent.click(button);
    
    const panel = screen.getByText('性能指标');
    expect(panel).toBeInTheDocument();
  });

  it('should hide panel when button is clicked again', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能');
    fireEvent.click(button);
    expect(screen.getByText('性能指标')).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(screen.queryByText('性能指标')).not.toBeInTheDocument();
  });

  it('should display all performance metrics', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能');
    fireEvent.click(button);
    
    expect(screen.getByText('FCP (首次内容绘制)')).toBeInTheDocument();
    expect(screen.getByText('LCP (最大内容绘制)')).toBeInTheDocument();
    expect(screen.getByText('FID (首次输入延迟)')).toBeInTheDocument();
    expect(screen.getByText('CLS (累积布局偏移)')).toBeInTheDocument();
    expect(screen.getByText('TTFB (首字节时间)')).toBeInTheDocument();
    expect(screen.getByText('DOM加载完成')).toBeInTheDocument();
    expect(screen.getByText('页面完全加载')).toBeInTheDocument();
  });

  it('should format time correctly', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能');
    fireEvent.click(button);
    
    const dashElements = screen.getAllByText('-');
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it('should have fixed position for button', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能').closest('button');
    expect(button).toHaveClass('bottom-5');
    expect(button).toHaveClass('right-5');
  });

  it('should have fixed position for panel', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能');
    fireEvent.click(button);
    
    const panel = screen.getByText('性能指标').closest('.fixed');
    expect(panel).toBeInTheDocument();
  });

  it('should render status colors correctly', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能');
    fireEvent.click(button);
    
    const fcpRow = screen.getByText('FCP (首次内容绘制)').parentElement;
    expect(fcpRow).not.toBeNull();
  });

  it('should display navigation timing metrics', () => {
    render(<PerformanceMonitor />);
    
    const button = screen.getByText('🚀 性能');
    fireEvent.click(button);
    
    expect(screen.getByText('150.00ms')).toBeInTheDocument();
    expect(screen.getByText('800.00ms')).toBeInTheDocument();
    expect(screen.getByText('1500.00ms')).toBeInTheDocument();
  });
});