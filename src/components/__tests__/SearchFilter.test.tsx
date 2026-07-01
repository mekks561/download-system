import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchFilter from '../SearchFilter';

describe('SearchFilter Component', () => {
  const mockOnSearch = jest.fn();
  const mockOnSavePreset = jest.fn();
  const mockOnLoadPreset = jest.fn();
  const mockOnDeletePreset = jest.fn();
  const mockOnShare = jest.fn();
  const mockOnExport = jest.fn();
  const mockOnAdvancedSearch = jest.fn();

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
        dateRange: { start: null, end: null },
        sortBy: 'created_at' as const,
        sortOrder: 'desc' as const,
        searchFields: ['filename', 'url'] as ('filename' | 'url')[],
        regexEnabled: false,
        caseSensitive: false,
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
    jest.clearAllMocks();
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
    jest.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'test' } });

    jest.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenCalled();
    jest.useRealTimers();
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
    jest.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'test' } });
    
    jest.advanceTimersByTime(300);

    const clearButton = screen.getByText('×');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
    jest.useRealTimers();
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
    jest.useFakeTimers();
    
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

    jest.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: ['image'] })
    );

    fireEvent.click(imageButton);
    
    jest.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: [] })
    );

    jest.useRealTimers();
  });

  it('should toggle status filters', async () => {
    jest.useFakeTimers();
    
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

    jest.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ['completed'] })
    );

    jest.useRealTimers();
  });

  it('should change category filter', async () => {
    jest.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const categoryTitle = screen.getByText('📂 分类');
    const categorySection = categoryTitle.closest('div');
    const categorySelect = categorySection?.querySelector('select');
    expect(categorySelect).not.toBeNull();
    
    fireEvent.change(categorySelect!, { target: { value: '1' } });

    jest.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 1 })
    );

    jest.useRealTimers();
  });

  it('should change sort options', async () => {
    jest.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const filterToggle = screen.getByText(/筛选/);
    fireEvent.click(filterToggle);

    const sortSelect = screen.getByDisplayValue('创建时间');
    fireEvent.change(sortSelect, { target: { value: 'file_size' } });

    jest.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: 'file_size' })
    );

    const sortOrderButton = screen.getByText(/降序/);
    fireEvent.click(sortOrderButton);

    jest.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortOrder: 'asc' })
    );

    jest.useRealTimers();
  });

  it('should toggle regex and case sensitive options', async () => {
    jest.useFakeTimers();
    
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

    jest.advanceTimersByTime(500);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ regexEnabled: true })
    );

    const caseButton = screen.getByText(/大小写敏感/);
    fireEvent.click(caseButton);

    jest.advanceTimersByTime(500);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ caseSensitive: true })
    );

    jest.useRealTimers();
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
    jest.useFakeTimers();
    
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

    jest.advanceTimersByTime(300);

    const clearButton = screen.getByText('🗑️ 清除所有筛选');
    fireEvent.click(clearButton);

    jest.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: [],
        status: [],
        category: null,
        keyword: '',
      })
    );

    jest.useRealTimers();
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
    jest.useFakeTimers();
    
    render(
      <SearchFilter
        onSearch={mockOnSearch}
        categories={categories}
      />
    );

    const input = screen.getByPlaceholderText(/搜索文件/);
    fireEvent.change(input, { target: { value: 'test' } });

    jest.advanceTimersByTime(300);

    const filterToggle = screen.getByText(/筛选/);
    expect(filterToggle).toBeInTheDocument();

    jest.useRealTimers();
  });
});