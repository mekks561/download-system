import { render, screen, fireEvent } from '@testing-library/react';
import NotificationPanel, { Notification } from '../NotificationPanel';

describe('NotificationPanel Component', () => {
  const mockOnNotificationClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notification button with bell icon', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    expect(bellButton).toBeInTheDocument();
  });

  it('should show unread count badge', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    expect(screen.getByText('通知中心')).toBeInTheDocument();
  });

  it('should toggle panel on button click', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    
    fireEvent.click(bellButton);
    expect(screen.getByText('通知中心')).toBeInTheDocument();
    
    fireEvent.click(bellButton);
    expect(screen.queryByText('通知中心')).not.toBeInTheDocument();
  });

  it('should display mock notifications', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    expect(screen.getByText('下载完成')).toBeInTheDocument();
    expect(screen.getByText('上传完成')).toBeInTheDocument();
    expect(screen.getByText('下载失败')).toBeInTheDocument();
  });

  it('should filter notifications by all/unread', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    const filterButtons = screen.getAllByRole('button');
    const allButton = filterButtons.find(btn => btn.textContent?.includes('全部'));
    const unreadButton = filterButtons.find(btn => btn.textContent?.includes('未读'));
    
    expect(allButton).toBeInTheDocument();
    expect(unreadButton).toBeInTheDocument();
    
    fireEvent.click(unreadButton!);
    
    expect(screen.getByText('下载完成')).toBeInTheDocument();
  });

  it('should mark notification as read on click', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    const notificationItem = screen.getByText('下载完成').closest('div');
    fireEvent.click(notificationItem!);
  });

  it('should mark all notifications as read', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    const markAllReadButton = screen.getByText('全部已读');
    fireEvent.click(markAllReadButton);
  });

  it('should delete a notification', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    const deleteButtons = document.querySelectorAll('[title="删除通知"]');
    expect(deleteButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(deleteButtons[0]);
  });

  it('should clear all notifications', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    const clearAllButton = screen.getByText('清空');
    fireEvent.click(clearAllButton);
    
    expect(screen.getByText('暂无通知')).toBeInTheDocument();
  });

  it('should display empty state when no notifications', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    const clearAllButton = screen.getByText('清空');
    fireEvent.click(clearAllButton);
    
    expect(screen.getByText('📭')).toBeInTheDocument();
    expect(screen.getByText('暂无通知')).toBeInTheDocument();
  });

  it('should display notification types correctly', () => {
    render(<NotificationPanel />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    expect(screen.getAllByText('✅').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⚠️').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ℹ️').length).toBeGreaterThan(0);
    expect(screen.getAllByText('❌').length).toBeGreaterThan(0);
  });

  it('should call onNotificationClick callback', () => {
    render(<NotificationPanel onNotificationClick={mockOnNotificationClick} />);
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    const notificationItem = screen.getByText('下载完成').closest('div');
    fireEvent.click(notificationItem!);
    
    expect(mockOnNotificationClick).toHaveBeenCalled();
  });
});