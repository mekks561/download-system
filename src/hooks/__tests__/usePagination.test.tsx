﻿﻿import { renderHook, act } from '@testing-library/react';
import { usePagination, useServerPagination } from '../usePagination';

describe('usePagination', () => {
  const totalItems = 100;

  test('should initialize with default values', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems })
    );

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(10);
    expect(result.current.totalItems).toBe(100);
  });

  test('should initialize with custom values', () => {
    const { result } = renderHook(() => 
      usePagination({ 
        totalItems, 
        initialPage: 3,
        initialPageSize: 20 
      })
    );

    expect(result.current.currentPage).toBe(3);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(5);
  });

  test('should navigate to next page', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPageSize: 10 })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(true);
  });

  test('should navigate to previous page', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPage: 5 })
    );

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(4);
    expect(result.current.hasPreviousPage).toBe(true);
  });

  test('should navigate to first page', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPage: 5 })
    );

    act(() => {
      result.current.firstPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.isFirstPage).toBe(true);
  });

  test('should navigate to last page', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPageSize: 10 })
    );

    act(() => {
      result.current.lastPage();
    });

    expect(result.current.currentPage).toBe(10);
    expect(result.current.isLastPage).toBe(true);
  });

  test('should go to specific page', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPageSize: 10 })
    );

    act(() => {
      result.current.goToPage(7);
    });

    expect(result.current.currentPage).toBe(7);
  });

  test('should not go beyond first page', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPageSize: 10 })
    );

    act(() => {
      result.current.goToPage(0);
    });

    expect(result.current.currentPage).toBe(1);
  });

  test('should not go beyond last page', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPageSize: 10 })
    );

    act(() => {
      result.current.goToPage(100);
    });

    expect(result.current.currentPage).toBe(10);
  });

  test('should update page size', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPageSize: 10, initialPage: 5 })
    );

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.pageSize).toBe(25);
    expect(result.current.totalPages).toBe(4);
  });

  test('should reset pagination', () => {
    const { result } = renderHook(() => 
      usePagination({ 
        totalItems, 
        initialPageSize: 20, 
        initialPage: 5
      })
    );

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(20);
  });

  test('should calculate correct start and end indices', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPageSize: 10, initialPage: 3 })
    );

    expect(result.current.startIndex).toBe(21);
    expect(result.current.endIndex).toBe(30);
  });

  test('should handle empty data', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems: 0 })
    );

    expect(result.current.totalPages).toBe(0);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(0);
  });

  test('should generate correct pagination info', () => {
    const { result } = renderHook(() => 
      usePagination({ totalItems, initialPageSize: 10, initialPage: 3 })
    );

    const info = result.current.getPaginationInfo();
    
    expect(info.showing).toBe('显示 21 - 30 条，共 100 条');
    expect(info.pageRange).toBe('第 3 / 10 页');
  });
});

describe('useServerPagination', () => {
  test('should initialize with loading state', async () => {
    const fetchData = vi.fn().mockResolvedValue({
      data: [],
      total: 0
    });

    const { result } = renderHook(() => 
      useServerPagination({ fetchData })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  test('should fetch data on mount', async () => {
    const mockData = [{ id: 1, name: 'Test' }];
    const fetchData = vi.fn().mockResolvedValue({
      data: mockData,
      total: 1
    });

    const { result } = renderHook(() => 
      useServerPagination({ fetchData })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(fetchData).toHaveBeenCalledWith(1, 10);
  });

  test('should navigate pages', async () => {
    const mockData = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const fetchData = vi.fn().mockImplementation((page: number, size: number) => {
      const start = (page - 1) * size;
      return Promise.resolve({
        data: mockData.slice(start, start + size),
        total: 50
      });
    });

    const { result } = renderHook(() => 
      useServerPagination({ fetchData })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    act(() => {
      result.current.nextPage();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.currentPage).toBe(2);
  });
});