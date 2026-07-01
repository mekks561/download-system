import React from 'react';
import { DownloadItem as DownloadItemType } from '../types';
import { DownloadService } from '../services/DownloadService';
import { ProgressBar } from './ProgressBar';

interface DownloadItemProps {
  item: DownloadItemType;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  highlightKeyword?: string;
}

const downloadService = DownloadService.getInstance();

const highlightText = (text: string, keyword: string): React.ReactNode => {
  if (!keyword) return text;
  
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (regex.test(part)) {
      return <mark key={index} className="search-highlight">{part}</mark>;
    }
    return part;
  });
};

const DownloadItemComponent: React.FC<DownloadItemProps> = ({
  item,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRemove,
  highlightKeyword,
}) => {
  const getStatusText = () => {
    switch (item.status) {
      case 'pending':
        return '等待下载';
      case 'downloading':
        return '下载中';
      case 'paused':
        return '已暂停';
      case 'completed':
        return '已完成';
      case 'error':
        return '下载失败';
      case 'cancelled':
        return '已取消';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'pending':
        return 'text-gray-500';
      case 'downloading':
        return 'text-blue-500';
      case 'paused':
        return 'text-yellow-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'cancelled':
        return 'text-gray-400';
      default:
        return 'text-gray-500';
    }
  };

  const getActions = () => {
    switch (item.status) {
      case 'pending':
        return (
          <button
            className="action-btn btn-primary"
            onClick={() => onStart(item.id)}
          >
            ▶ 开始
          </button>
        );
      case 'downloading':
        return (
          <>
            <button
              className="action-btn btn-secondary"
              onClick={() => onPause(item.id)}
            >
              ⏸ 暂停
            </button>
            <button
              className="action-btn btn-danger"
              onClick={() => onCancel(item.id)}
            >
              ✕ 取消
            </button>
          </>
        );
      case 'paused':
        return (
          <>
            <button
              className="action-btn btn-primary"
              onClick={() => onResume(item.id)}
            >
              ▶ 继续
            </button>
            <button
              className="action-btn btn-danger"
              onClick={() => onCancel(item.id)}
            >
              ✕ 取消
            </button>
          </>
        );
      case 'completed':
      case 'cancelled':
        return (
          <button
            className="action-btn btn-secondary"
            onClick={() => onRemove(item.id)}
          >
            🗑 删除
          </button>
        );
      case 'error':
        return (
          <>
            <button
              className="action-btn btn-primary"
              onClick={() => onResume(item.id)}
            >
              🔄 重试
            </button>
            <button
              className="action-btn btn-secondary"
              onClick={() => onRemove(item.id)}
            >
              🗑 删除
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="download-item">
      <div className="download-icon">
        📥
      </div>
      <div className="download-info">
        <div className="download-filename">{highlightText(item.filename, highlightKeyword || '')}</div>
        <div className="download-meta">
          <span className={`download-status ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <span className="download-size">
            {downloadService.formatFileSize(item.downloadedBytes)} / {downloadService.formatFileSize(item.totalBytes)}
          </span>
          {item.status === 'downloading' && (
            <span className="download-speed">
              ⚡ {downloadService.formatSpeed(item.speed)}
            </span>
          )}
        </div>
        {(item.status === 'downloading' || item.status === 'paused') && (
          <ProgressBar progress={item.progress} />
        )}
        {item.error && (
          <div className="download-error">
            ❌ {item.error}
          </div>
        )}
      </div>
      <div className="download-actions">
        {getActions()}
      </div>
    </div>
  );
};

const DownloadItem = React.memo(DownloadItemComponent);

export { DownloadItem };
export default DownloadItem;