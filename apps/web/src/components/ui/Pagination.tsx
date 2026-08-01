import React from 'react';
import { Button } from './shadcn';

export interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  onChange?: (page: number) => void;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize = 10,
  onChange,
  showSizeChanger = false,
  pageSizeOptions = [10, 20, 50, 100],
  showTotal,
  className = '',
}) => {
  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== current) {
      onChange?.(page);
    }
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    const newCurrent = Math.min(current, Math.ceil(total / newSize));
    onChange?.(newCurrent);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(
        <Button
          key="first"
          variant="ghost"
          size="sm"
          onClick={() => handlePageChange(1)}
        >
          1
        </Button>
      );
      if (start > 2) {
        pages.push(<span key="ellipsis-start" className="px-2 text-gray-400">...</span>);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === current ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis-end" className="px-2 text-gray-400">...</span>);
      }
      pages.push(
        <Button
          key="last"
          variant="ghost"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Button>
      );
    }

    return pages;
  };

  const startIndex = (current - 1) * pageSize + 1;
  const endIndex = Math.min(current * pageSize, total);

  return (
    <div className={`flex items-center justify-center gap-4 py-4 ${className}`}>
      {showSizeChanger && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={pageSize}
            onChange={handleSizeChange}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
      )}

      {showTotal && (
        <span className="text-sm text-gray-500">
          {showTotal(total, [startIndex, endIndex])}
        </span>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageChange(current - 1)}
          disabled={current <= 1}
        >
          上一页
        </Button>
        {renderPageNumbers()}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageChange(current + 1)}
          disabled={current >= totalPages}
        >
          下一页
        </Button>
      </div>
    </div>
  );
};

export default Pagination;