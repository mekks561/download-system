import React from 'react';
import './Pagination.css';

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
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(
        <button
          key="first"
          className="pagination-item"
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );
      if (start > 2) {
        pages.push(<span key="ellipsis-start" className="pagination-ellipsis">...</span>);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-item${i === current ? ' active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis-end" className="pagination-ellipsis">...</span>);
      }
      pages.push(
        <button
          key="last"
          className="pagination-item"
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  const startIndex = (current - 1) * pageSize + 1;
  const endIndex = Math.min(current * pageSize, total);

  return (
    <div className={`pagination${className ? ` ${className}` : ''}`}>
      {showSizeChanger && (
        <div className="pagination-size-changer">
          <span className="pagination-text">每页</span>
          <select
            className="pagination-select"
            value={pageSize}
            onChange={handleSizeChange}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="pagination-text">条</span>
        </div>
      )}

      {showTotal && (
        <span className="pagination-total">
          {showTotal(total, [startIndex, endIndex])}
        </span>
      )}

      <div className="pagination-list">
        <button
          className="pagination-item pagination-prev"
          onClick={() => handlePageChange(current - 1)}
          disabled={current <= 1}
        >
          上一页
        </button>
        {renderPageNumbers()}
        <button
          className="pagination-item pagination-next"
          onClick={() => handlePageChange(current + 1)}
          disabled={current >= totalPages}
        >
          下一页
        </button>
      </div>
    </div>
  );
};

export default Pagination;