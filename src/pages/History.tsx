import React, { useMemo, useCallback, useReducer } from 'react';
import { useDownloadStore } from '../store/useDownloadStore';
import { useUploadStore } from '../store/useUploadStore';


type HistoryType = 'all' | 'download' | 'upload';
type HistoryStatus = 'all' | 'completed' | 'failed' | 'cancelled';

interface HistoryRecord {
  id: string;
  type: 'download' | 'upload';
  filename: string;
  status: string;
  size: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

interface HistoryFilterState {
  typeFilter: HistoryType;
  statusFilter: HistoryStatus;
  searchQuery: string;
  currentPage: number;
}

type HistoryFilterAction =
  | { type: 'SET_TYPE'; value: HistoryType }
  | { type: 'SET_STATUS'; value: HistoryStatus }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_PAGE'; page: number };

const filterReducer = (state: HistoryFilterState, action: HistoryFilterAction): HistoryFilterState => {
  switch (action.type) {
    case 'SET_TYPE':
      return { ...state, typeFilter: action.value, currentPage: 1 };
    case 'SET_STATUS':
      return { ...state, statusFilter: action.value, currentPage: 1 };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.value, currentPage: 1 };
    case 'SET_PAGE':
      return { ...state, currentPage: Math.max(1, action.page) };
    default:
      return state;
  }
};

const History: React.FC = () => {
  const { downloads } = useDownloadStore();
  const { uploads } = useUploadStore();

  const [filterState, dispatchFilter] = useReducer(filterReducer, {
    typeFilter: 'all',
    statusFilter: 'all',
    searchQuery: '',
    currentPage: 1,
  });

  const { typeFilter, statusFilter, searchQuery, currentPage } = filterState;
  const pageSize = 20;

  // 从 store 中提取历史记录（已完成、失败、已取消的）
  const historyRecords = useMemo<HistoryRecord[]>(() => {
    const downloadHistory: HistoryRecord[] = downloads
      .filter(d => ['completed', 'error', 'cancelled'].includes(d.status))
      .map(d => ({
        id: d.id,
        type: 'download' as const,
        filename: d.filename,
        status: d.status,
        size: d.totalBytes,
        createdAt: d.createdAt,
        completedAt: d.completedAt,
        error: d.error,
      }));

    const uploadHistory: HistoryRecord[] = uploads
      .filter(u => ['completed', 'error', 'cancelled'].includes(u.status))
      .map(u => ({
        id: u.id,
        type: 'upload' as const,
        filename: u.filename,
        status: u.status,
        size: u.totalBytes,
        createdAt: u.createdAt,
        completedAt: u.completedAt,
        error: u.error,
      }));

    return [...downloadHistory, ...uploadHistory].sort((a, b) => b.createdAt - a.createdAt);
  }, [downloads, uploads]);

  // 过滤后的记录
  const filteredRecords = useMemo(() => {
    return historyRecords.filter(record => {
      if (typeFilter !== 'all' && record.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const statusMap: Record<HistoryStatus, string[]> = {
          all: [],
          completed: ['completed'],
          failed: ['error'],
          cancelled: ['cancelled'],
        };
        if (!statusMap[statusFilter].includes(record.status)) return false;
      }
      if (searchQuery && !record.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [historyRecords, typeFilter, statusFilter, searchQuery]);

  // 分页
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, validCurrentPage]);

  

  // 统计信息
  const stats = useMemo(() => {
    const completed = historyRecords.filter(r => r.status === 'completed').length;
    const failed = historyRecords.filter(r => r.status === 'error').length;
    const cancelled = historyRecords.filter(r => r.status === 'cancelled').length;
    const totalSize = historyRecords
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.size, 0);
    return { total: historyRecords.length, completed, failed, cancelled, totalSize };
  }, [historyRecords]);

  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTime = useCallback((timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'cancelled': return '🚫';
      default: return '📋';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed': return '已完成';
      case 'error': return '失败';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'error': return '#ef4444';
      case 'cancelled': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  return (
    <div className="history-page">
      <div className="page-header">
        <h2 className="page-title">📜 历史记录</h2>
        <p className="page-desc">查看所有下载和上传的历史记录</p>
      </div>

      {/* 统计卡片 */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>📊</span>
          <div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>总记录</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #22c55e' }}>
          <span style={styles.statIcon}>✅</span>
          <div>
            <div style={styles.statValue}>{stats.completed}</div>
            <div style={styles.statLabel}>已完成</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #ef4444' }}>
          <span style={styles.statIcon}>❌</span>
          <div>
            <div style={styles.statValue}>{stats.failed}</div>
            <div style={styles.statLabel}>失败</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '3px solid #9ca3af' }}>
          <span style={styles.statIcon}>🚫</span>
          <div>
            <div style={styles.statValue}>{stats.cancelled}</div>
            <div style={styles.statLabel}>已取消</div>
          </div>
        </div>
      </div>

      {/* 过滤器 */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>类型:</label>
          <select
            style={styles.select}
            value={typeFilter}
            onChange={(e) => dispatchFilter({ type: 'SET_TYPE', value: e.target.value as HistoryType })}
          >
            <option value="all">全部</option>
            <option value="download">下载</option>
            <option value="upload">上传</option>
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>状态:</label>
          <select
            style={styles.select}
            value={statusFilter}
            onChange={(e) => dispatchFilter({ type: 'SET_STATUS', value: e.target.value as HistoryStatus })}
          >
            <option value="all">全部</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="搜索文件名..."
          value={searchQuery}
          onChange={(e) => dispatchFilter({ type: 'SET_SEARCH', value: e.target.value })}
        />
      </div>

      {/* 历史记录列表 */}
      {paginatedRecords.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📋</span>
          <p style={styles.emptyText}>暂无历史记录</p>
          <p style={styles.emptyHint}>完成的下载和上传任务将显示在这里</p>
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>类型</th>
                  <th style={styles.th}>文件名</th>
                  <th style={styles.th}>状态</th>
                  <th style={styles.th}>大小</th>
                  <th style={styles.th}>创建时间</th>
                  <th style={styles.th}>完成时间</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => (
                  <tr key={`${record.type}-${record.id}`} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.typeIcon}>
                        {record.type === 'download' ? '⬇️' : '⬆️'}
                      </span>
                    </td>
                    <td style={styles.tdFilename} title={record.filename}>
                      {record.filename}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        color: getStatusColor(record.status),
                        backgroundColor: getStatusColor(record.status) + '15',
                      }}>
                        {getStatusIcon(record.status)} {getStatusText(record.status)}
                      </span>
                      {record.error && (
                        <div style={styles.errorMsg} title={record.error}>{record.error}</div>
                      )}
                    </td>
                    <td style={styles.td}>{formatSize(record.size)}</td>
                    <td style={styles.td}>{formatTime(record.createdAt)}</td>
                    <td style={styles.td}>
                      {record.completedAt ? formatTime(record.completedAt) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={{ ...styles.pageBtn, ...(validCurrentPage === 1 ? styles.pageBtnDisabled : {}) }}
                disabled={validCurrentPage === 1}
                onClick={() => dispatchFilter({ type: 'SET_PAGE', page: currentPage - 1 })}
              >
                上一页
              </button>
              <span style={styles.pageInfo}>
                {validCurrentPage} / {totalPages}
              </span>
              <button
                style={{ ...styles.pageBtn, ...(validCurrentPage === totalPages ? styles.pageBtnDisabled : {}) }}
                disabled={validCurrentPage === totalPages}
                onClick={() => dispatchFilter({ type: 'SET_PAGE', page: currentPage + 1 })}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    borderLeft: '3px solid #3b82f6',
  },
  statIcon: {
    fontSize: '28px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  select: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    borderBottom: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
    whiteSpace: 'nowrap',
  },
  tdFilename: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#1a1a2e',
    fontWeight: '500',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  typeIcon: {
    fontSize: '18px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
  },
  errorMsg: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '500',
    margin: '0 0 4px 0',
  },
  emptyHint: {
    fontSize: '14px',
    margin: 0,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px',
  },
  pageBtn: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
  },
  pageBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
};

export default History;
