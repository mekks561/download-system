import React from 'react';
import { UploadItem as UploadItemType } from '../types';
import { UploadService } from '../services/UploadService';
import { ProgressBar } from './ProgressBar';

interface UploadItemProps {
  item: UploadItemType;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

const uploadService = UploadService.getInstance();

const UploadItemComponent: React.FC<UploadItemProps> = ({
  item,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRemove,
}) => {
  const getStatusText = () => {
    switch (item.status) {
      case 'pending':
        return '等待上传';
      case 'uploading':
        return '上传中';
      case 'paused':
        return '已暂停';
      case 'completed':
        return '已完成';
      case 'error':
        return '上传失败';
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
      case 'uploading':
        return 'text-purple-500';
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
      case 'uploading':
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
    <div className="upload-item">
      <div className="upload-icon">
        📤
      </div>
      <div className="upload-info">
        <div className="upload-filename">{item.filename}</div>
        <div className="upload-meta">
          <span className={`upload-status ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <span className="upload-size">
            {uploadService.formatFileSize(item.uploadedBytes)} / {uploadService.formatFileSize(item.totalBytes)}
          </span>
          {item.status === 'uploading' && (
            <span className="upload-speed">
              ⚡ {uploadService.formatSpeed(item.speed)}
            </span>
          )}
        </div>
        {(item.status === 'uploading' || item.status === 'paused') && (
          <ProgressBar progress={item.progress} color="#9333ea" />
        )}
        {item.error && (
          <div className="upload-error">
            ❌ {item.error}
          </div>
        )}
      </div>
      <div className="upload-actions">
        {getActions()}
      </div>
    </div>
  );
};

const UploadItem = React.memo(UploadItemComponent);

export { UploadItem };
export default UploadItem;
