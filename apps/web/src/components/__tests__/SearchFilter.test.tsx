import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchFilter from '../SearchFilter';

describe('SearchFilter Component', () => {
  const mockOnSearch = vi.fn();
  const mockOnSavePreset = vi.fn();
  const mockOnLoadPreset = vi.fn();
  const mockOnDeletePreset = vi.fn();
  const mockOnShare = vi.fn();
  const mockOnExport = vi.fn();
  const mockOnAdvancedSearch = vi.fn();

  const categories = [
    { id: 1, name: '视频', color: '#ef4444' },
    { id: 2, name: '文档', color: '#3b82f6' },
    { id: 3, name: '图片', color: '#10b981' },
  ];

  const presets = [
    {
      id: 'preset-1',
      name: '我的视频',
      filters: {
        keyword: '',
        type: ['video'],
        status: [],
        category: null,
        tags: [],
        dateRange: { start: null, end: null },
        sortBy: 'created_at' as const,
        sortOrder: 'desc' as const,
        searchFields: ['filename', 'url'] as ('filename' | 'url')[],
        regexEnabled: false,
        caseSensitive: false,
        fuzzySearch: false,
      },
      createdAt: Date.now() - 86400000,
      usageCount: 5,
    },
  ];

  const suggestions = [
    { type: 'filename' as const, value: 'video.mp4', display: 'video.mp4', icon: '📄' },
    { type: 'history' as const, value: 'document', display: 'document', icon: '🕐' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render search input and basic elements', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    expect(screen.getByPlaceholderText(/搜索文件/)).toBeInTheDocument();
    expect(screen.getByText(/筛选/)).toBeInTheDocument();
  });

  it('should call onSearch when keyword changes', async () => {
    vi.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'test' } });

    vi.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should add search keyword to history', async () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      const history = localStorage.getItem('searchHistory');
      expect(history).toBe(JSON.stringify(['test']));
    });
  });

  it('should clear keyword when clear button is clicked', async () => {
    vi.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'test' } });
    
    vi.advanceTimersByTime(300);

    const clearButton = screen.getByText('×');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
    vi.useRealTimers();
  });

  it('should toggle filter panel', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    expect(screen.getByText(/搜索选项/)).toBeInTheDocument();

    fireEvent.click(filterToggle);
    expect(screen.queryByText(/搜索选项/)).not.toBeInTheDocument();
  });

  it('should toggle file type filters', async () => {
    vi.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const imageButton = screen.getByText('🖼️ 图片');
    fireEvent.click(imageButton);

    vi.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: ['image'] })
    );

    fireEvent.click(imageButton);
    
    vi.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: [] })
    );

    vi.useRealTimers();
  });

  it('should toggle status filters', async () => {
    vi.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const completedButton = screen.getByText('✅ 已完成');
    fireEvent.click(completedButton);

    vi.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ['completed'] })
    );

    vi.useRealTimers();
  });

  it('should change category filter', async () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const categoryTriggers = screen.getAllByRole('combobox');
    const categoryTrigger = categoryTriggers[0];
    fireEvent.click(categoryTrigger);

    const videoOption = await screen.findByText('视频');
    expect(videoOption).toBeInTheDocument();
  });

  it('should change sort options', async () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const comboboxes = screen.getAllByRole('combobox');
    const sortTrigger = comboboxes[comboboxes.length - 1];
    fireEvent.click(sortTrigger);

    const fileSizeOption = await screen.findByText('文件大小');
    expect(fileSizeOption).toBeInTheDocument();
  });

  it('should toggle regex and case sensitive options', async () => {
    vi.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const regexButton = screen.getByText(/正则表达式/);
    fireEvent.click(regexButton);

    vi.advanceTimersByTime(500);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ regexEnabled: true })
    );

    const caseButton = screen.getByText(/大小写敏感/);
    fireEvent.click(caseButton);

    vi.advanceTimersByTime(500);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ caseSensitive: true })
    );

    vi.useRealTimers();
  });

  it('should show suggestions dropdown when provided', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
        suggestions={suggestions}
      />
    );

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'video' } });
    fireEvent.focus(input);
  });

  it('should show presets panel', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
        presets={presets}
      />
    );

    const buttons = document.querySelectorAll('button');
    const presetsButton = Array.from(buttons).find(btn => btn.getAttribute('title') === '预设管理');
    expect(presetsButton).not.toBeNull();
    fireEvent.click(presetsButton!);

    expect(screen.getByText(/保存的搜索预设/)).toBeInTheDocument();
    expect(screen.getByText('我的视频')).toBeInTheDocument();
  });

  it('should load preset when clicked', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
        presets={presets}
        onLoadPreset={mockOnLoadPreset}
      />
    );

    const buttons = document.querySelectorAll('button');
    const presetsButton = Array.from(buttons).find(btn => btn.getAttribute('title') === '预设管理');
    expect(presetsButton).not.toBeNull();
    fireEvent.click(presetsButton!);

    const presetItem = screen.getByText('我的视频');
    fireEvent.click(presetItem);

    expect(mockOnLoadPreset).toHaveBeenCalledWith('preset-1');
  });

  it('should delete preset', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
        presets={presets}
        onDeletePreset={mockOnDeletePreset}
      />
    );

    const buttons = document.querySelectorAll('button');
    const presetsButton = Array.from(buttons).find(btn => btn.getAttribute('title') === '预设管理');
    expect(presetsButton).not.toBeNull();
    fireEvent.click(presetsButton!);

    const deleteButton = screen.getByText('🗑️');
    fireEvent.click(deleteButton);

    expect(mockOnDeletePreset).toHaveBeenCalledWith('preset-1');
  });

  it('should trigger share functionality', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
        onShare={mockOnShare}
      />
    );

    const shareButtons = screen.getAllByText('🔗');
    const shareButton = shareButtons.find(btn => btn.closest('button')?.getAttribute('title') === '分享搜索结果');
    fireEvent.click(shareButton!);

    expect(mockOnShare).toHaveBeenCalled();
    expect(screen.getByText(/分享搜索结果/)).toBeInTheDocument();
  });

  it('should trigger export functionality', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByText('📥');
    fireEvent.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledWith('csv');
  });

  it('should clear all filters', async () => {
    vi.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const imageButton = screen.getByText('🖼️ 图片');
    fireEvent.click(imageButton);

    const completedButton = screen.getByText('✅ 已完成');
    fireEvent.click(completedButton);

    vi.advanceTimersByTime(300);

    const clearButton = screen.getByText('🗑️ 清除所有筛选');
    fireEvent.click(clearButton);

    vi.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: [],
        status: [],
        category: null,
        keyword: '',
      })
    );

    vi.useRealTimers();
  });

  it('should show search count when available', () => {
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
        searchCount={10}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'test' } });
  });

  it('should show active badge when filters are applied', async () => {
    vi.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'test' } });

    vi.advanceTimersByTime(300);

    const filterToggle = screen.getByText(/筛选/);
    expect(filterToggle).toBeInTheDocument();

    vi.useRealTimers();
  });
});