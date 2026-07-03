import React from 'react';
import { DownloadItem as DownloadItemType } from '../types';
import { DownloadService } from '../services/DownloadService';
import { Button } from './ui/shadcn/Button';
import { Progress } from './ui/shadcn/Progress';
import { Badge } from './ui/shadcn/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/shadcn/Tooltip';

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

  const getStatusBadgeVariant = (): 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' => {
    switch (item.status) {
      case 'pending':
        return 'secondary';
      case 'downloading':
        return 'default';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'cancelled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getActions = () => {
    switch (item.status) {
      case 'pending':
        return (
          <Button
            size="sm"
            onClick={() => onStart(item.id)}
          >
            开始
          </Button>
        );
      case 'downloading':
        return (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPause(item.id)}
            >
              暂停
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(item.id)}
            >
              取消
            </Button>
          </>
        );
      case 'paused':
        return (
          <>
            <Button
              size="sm"
              onClick={() => onResume(item.id)}
            >
              继续
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(item.id)}
            >
              取消
            </Button>
          </>
        );
      case 'completed':
      case 'cancelled':
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRemove(item.id)}
          >
            删除
          </Button>
        );
      case 'error':
        return (
          <>
            <Button
              size="sm"
              onClick={() => onResume(item.id)}
            >
              重试
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRemove(item.id)}
            >
              删除
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary-50 rounded-lg text-2xl">
        📥
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {highlightText(item.filename, highlightKeyword || '')}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <Badge variant={getStatusBadgeVariant()}>
            {getStatusText()}
          </Badge>
          <span>
            {downloadService.formatFileSize(item.downloadedBytes)} / {downloadService.formatFileSize(item.totalBytes)}
          </span>
          {item.status === 'downloading' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-primary-600">
                  ⚡ {downloadService.formatSpeed(item.speed)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                下载速度
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {(item.status === 'downloading' || item.status === 'paused') && (
          <div className="mt-3">
            <Progress value={item.progress} />
          </div>
        )}
        {item.error && (
          <div className="mt-2 text-sm text-error-600 bg-error-50 px-3 py-2 rounded-md">
            ❌ {item.error}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">
        {getActions()}
      </div>
    </div>
    </TooltipProvider>
  );
};

const DownloadItem = React.memo(DownloadItemComponent);

export { DownloadItem };
export default DownloadItem;
