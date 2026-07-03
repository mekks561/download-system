import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareManager from '../ShareManager';
import { ToastProvider } from '../Toast';

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('ShareManager Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it('should render nothing when isOpen is false', () => {
    renderWithToast(<ShareManager isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText('文件分享管理')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', async () => {
    (globalThis.fetch as vi.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    
    renderWithToast(<ShareManager isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('🔗 文件分享管理')).toBeInTheDocument();
  });

  it('should show loading state initially', async () => {
    (globalThis.fetch as vi.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        json: () => Promise.resolve({ success: true, data: [] }),
      }), 100))
    );
    
    renderWithToast(<ShareManager isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should show empty state when no shares', async () => {
    (globalThis.fetch as vi.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    
    renderWithToast(<ShareManager isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByText('暂无分享链接')).toBeInTheDocument();
    });
  });

  it('should show shares when data is returned', async () => {
    const mockShares = [
      { id: 1, original_name: 'test.pdf', share_url: 'http://example.com/test.pdf', created_at: '2024-01-01', expires_at: '2024-01-31', download_count: 5, view_count: 10, max_downloads: 10, has_password: false, is_active: true, file_size: 1024 },
    ];
    
    (globalThis.fetch as vi.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockShares }),
    });
    
    renderWithToast(<ShareManager isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('should open create form when create button clicked', async () => {
    (globalThis.fetch as vi.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    
    renderWithToast(<ShareManager isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      const createButton = screen.getByText('➕ 创建分享链接');
      fireEvent.click(createButton);
      
      expect(screen.getByText('创建分享链接')).toBeInTheDocument();
    });
  });

  it('should close create form when cancel button clicked', async () => {
    (globalThis.fetch as vi.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    
    renderWithToast(<ShareManager isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      const createButton = screen.getByText('➕ 创建分享链接');
      fireEvent.click(createButton);
      
      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);
    });
  });

  it('should refresh shares when refresh button clicked', async () => {
    (globalThis.fetch as vi.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    
    renderWithToast(<ShareManager isOpen={true} onClose={mockOnClose} />);
    
    await waitFor(() => {
      const refreshButton = screen.getByText('🔄 刷新');
      fireEvent.click(refreshButton);
    });
  });
});