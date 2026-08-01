import { useState, useMemo, useCallback, useEffect } from 'react';

export interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
  pageSizeOptions?: number[];
  maxPageButtons?: number;
  syncToUrl?: boolean;
  urlParamName?: string;
}

export interface PaginationReturn {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  pageNumbers: number[];
  visiblePages: number[];
  pageSizeOptions: number[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
  getPaginationInfo: () => {
    showing: string;
    pageRange: string;
    totalPages: number;
  };
}

export function usePagination(options: PaginationOptions): PaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = 10,
    totalItems,
    pageSizeOptions = [10, 20, 50, 100],
    maxPageButtons = 7,
    syncToUrl = false,
    urlParamName = 'page'
  } = options;

  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const [currentPage, setCurrentPage] = useState(() => {
    if (syncToUrl && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get(urlParamName);
      if (pageParam) {
        const page = parseInt(pageParam, 10);
        if (!isNaN(page) && page >= 1) {
          const maxPage = Math.ceil(totalItems / pageSize);
          return Math.min(page, Math.max(1, maxPage));
        }
      }
    }
    return initialPage;
  });

  useEffect(() => {
    if (syncToUrl && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (currentPage > 1) {
        params.set(urlParamName, currentPage.toString());
      } else {
        params.delete(urlParamName);
      }
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentPage, syncToUrl, urlParamName]);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  const startIndex = useMemo(() => {
    if (totalItems === 0) return 0;
    return (currentPage - 1) * pageSize + 1;
  }, [currentPage, pageSize, totalItems]);

  const endIndex = useMemo(() => {
    if (totalItems === 0) return 0;
    return Math.min(currentPage * pageSize, totalItems);
  }, [currentPage, pageSize, totalItems]);

  const hasNextPage = useMemo(() => {
    return currentPage < totalPages;
  }, [currentPage, totalPages]);

  const hasPreviousPage = useMemo(() => {
    return currentPage > 1;
  }, [currentPage]);

  const isFirstPage = useMemo(() => {
    return currentPage === 1;
  }, [currentPage]);

  const isLastPage = useMemo(() => {
    return currentPage === totalPages;
  }, [currentPage, totalPages]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  const visiblePages = useMemo(() => {
    if (totalPages <= maxPageButtons) {
      return pageNumbers;
    }

    const halfButtons = Math.floor(maxPageButtons / 2);
    let start = currentPage - halfButtons;
    let end = currentPage + halfButtons;

    if (start < 1) {
      start = 1;
      end = maxPageButtons;
    }

    if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxPageButtons + 1;
    }

    const pages: number[] = [];

    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push(-1);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(-1);
      }
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages, maxPageButtons, pageNumbers]);

  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(targetPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    const newTotalPages = Math.ceil(totalItems / size);
    if (currentPage > newTotalPages) {
      setCurrentPage(Math.max(1, newTotalPages));
    } else {
      setCurrentPage(1);
    }
  }, [totalItems, currentPage]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setPageSizeState(initialPageSize);
  }, [initialPageSize]);

  const getPaginationInfo = useCallback(() => {
    const showing = totalItems === 0 
      ? '无数据' 
      : `显示 ${startIndex} - ${endIndex} 条，共 ${totalItems} 条`;

    const pageRange = totalPages === 0 
      ? '0 页' 
      : `第 ${currentPage} / ${totalPages} 页`;

    return {
      showing,
      pageRange,
      totalPages
    };
  }, [totalItems, startIndex, endIndex, currentPage, totalPages]);

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    isFirstPage,
    isLastPage,
    pageNumbers,
    visiblePages,
    pageSizeOptions,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    resetPagination,
    getPaginationInfo
  };
}

export interface UseServerPaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  maxPageButtons?: number;
  fetchData: (page: number, pageSize: number) => Promise<{ data: unknown[]; total: number }>;
}

export interface UseServerPaginationReturn {
  data: unknown[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  visiblePages: number[];
  pageSizeOptions: number[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
}

export function useServerPagination(options: UseServerPaginationOptions): UseServerPaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = 10,
    fetchData,
    pageSizeOptions = [10, 20, 50, 100],
    maxPageButtons = 7
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);
  const [data, setData] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  const loadData = useCallback(async (page: number, size: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchData(page, size);
      setData(result.data);
      setTotalItems(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      setData([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    void loadData(currentPage, pageSize);
  }, [currentPage, pageSize, loadData]);

  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(targetPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < (totalPages || 1)) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  const refresh = useCallback(() => {
    void loadData(currentPage, pageSize);
  }, [currentPage, pageSize, loadData]);

  const visiblePages = useMemo(() => {
    if (!totalPages || totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages || 0 }, (_, i) => i + 1);
    }

    const halfButtons = Math.floor(maxPageButtons / 2);
    let start = currentPage - halfButtons;
    let end = currentPage + halfButtons;

    if (start < 1) {
      start = 1;
      end = maxPageButtons;
    }

    if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxPageButtons + 1;
    }

    const pages: number[] = [];

    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push(-1);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(-1);
      }
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages, maxPageButtons]);

  return {
    data,
    totalItems,
    currentPage,
    pageSize,
    totalPages,
    isLoading,
    error,
    hasNextPage: currentPage < (totalPages || 1),
    hasPreviousPage: currentPage > 1,
    visiblePages,
    pageSizeOptions,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    refresh
  };
}

export default usePagination;
