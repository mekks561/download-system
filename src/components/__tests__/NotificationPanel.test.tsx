﻿﻿import { render, screen, fireEvent } from '@testing-library/react';
import NotificationPanel from '../NotificationPanel';
import { NotificationProvider } from '../../services/notificationService';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe('NotificationPanel Component', () => {
  const mockOnNotificationClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notification button with bell icon', () => {
    render(<NotificationPanel />, { wrapper: Wrapper });
    
    const bellButton = screen.getByText('🔔');
    expect(bellButton).toBeInTheDocument();
  });

  it('should show panel on button click', () => {
    render(<NotificationPanel />, { wrapper: Wrapper });
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    expect(screen.getByText('通知中心')).toBeInTheDocument();
  });

  it('should toggle panel on button click', () => {
    render(<NotificationPanel />, { wrapper: Wrapper });
    
    const bellButton = screen.getByText('🔔');
    
    fireEvent.click(bellButton);
    expect(screen.getByText('通知中心')).toBeInTheDocument();
    
    fireEvent.click(bellButton);
    expect(screen.queryByText('通知中心')).not.toBeInTheDocument();
  });

  it('should display empty state when no notifications', () => {
    render(<NotificationPanel />, { wrapper: Wrapper });
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    expect(screen.getByText('📭')).toBeInTheDocument();
    expect(screen.getByText('暂无通知')).toBeInTheDocument();
  });

  it('should filter notifications by all/unread', () => {
    render(<NotificationPanel />, { wrapper: Wrapper });
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    const filterButtons = screen.getAllByRole('button');
    const allButton = filterButtons.find(btn => btn.textContent?.includes('全部'));
    const unreadButton = filterButtons.find(btn => btn.textContent?.includes('未读'));
    
    expect(allButton).toBeInTheDocument();
    expect(unreadButton).toBeInTheDocument();
  });

  it('should call onNotificationClick callback', () => {
    render(<NotificationPanel onNotificationClick={mockOnNotificationClick} />, { wrapper: Wrapper });
    
    const bellButton = screen.getByText('🔔');
    fireEvent.click(bellButton);
    
    expect(screen.getByText('📭')).toBeInTheDocument();
  });
});
