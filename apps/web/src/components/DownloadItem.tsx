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
  
  let matchCount = 0;
  return parts.map((part) => {
    if (regex.test(part)) {
      matchCount++;
      return <mark key={`highlight-${part}-${matchCount}`} className="search-highlight">{part}</mark>;
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => onStart(item.id)}
                className="touch-friendly"
                aria-label="开始下载"
                aria-describedby={`status-${item.id}`}
              >
                ▶️
              </Button>
            </TooltipTrigger>
            <TooltipContent>开始下载</TooltipContent>
          </Tooltip>
        );
      case 'downloading':
        return (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => onPause(item.id)}
                  className="touch-friendly"
                  aria-label="暂停下载"
                  aria-describedby={`status-${item.id}`}
                >
                  ⏸️
                </Button>
              </TooltipTrigger>
              <TooltipContent>暂停下载</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onCancel(item.id)}
                  className="touch-friendly"
                  aria-label="取消下载"
                  aria-describedby={`status-${item.id}`}
                >
                  ✖️
                </Button>
              </TooltipTrigger>
              <TooltipContent>取消下载</TooltipContent>
            </Tooltip>
          </>
        );
      case 'paused':
        return (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => onResume(item.id)}
                  className="touch-friendly"
                  aria-label="继续下载"
                  aria-describedby={`status-${item.id}`}
                >
                  ▶️
                </Button>
              </TooltipTrigger>
              <TooltipContent>继续下载</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onCancel(item.id)}
                  className="touch-friendly"
                  aria-label="取消下载"
                  aria-describedby={`status-${item.id}`}
                >
                  ✖️
                </Button>
              </TooltipTrigger>
              <TooltipContent>取消下载</TooltipContent>
            </Tooltip>
          </>
        );
      case 'completed':
      case 'cancelled':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onRemove(item.id)}
                className="touch-friendly"
                aria-label="删除记录"
                aria-describedby={`status-${item.id}`}
              >
                🗑️
              </Button>
            </TooltipTrigger>
            <TooltipContent>删除记录</TooltipContent>
          </Tooltip>
        );
      case 'error':
        return (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => onResume(item.id)}
                  className="touch-friendly"
                  aria-label="重新下载"
                  aria-describedby={`status-${item.id}`}
                >
                  🔄
                </Button>
              </TooltipTrigger>
              <TooltipContent>重新下载</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => onRemove(item.id)}
                  className="touch-friendly"
                  aria-label="删除记录"
                  aria-describedby={`status-${item.id}`}
                >
                  🗑️
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除记录</TooltipContent>
            </Tooltip>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div 
        role="listitem"
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 md:p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 touch-ripple active:scale-[0.98] sm:active:scale-100"
        aria-label={`下载项: ${item.filename}`}
        aria-labelledby={`filename-${item.id}`}
        aria-describedby={`status-${item.id}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary-50 rounded-lg text-xl md:text-2xl" role="img" aria-hidden="true">
            📥
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate text-sm md:text-base" id={`filename-${item.id}`}>
              {highlightText(item.filename, highlightKeyword || '')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-gray-500 flex-wrap">
              <Badge variant={getStatusBadgeVariant()} className="text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-2" id={`status-${item.id}`}>
                {getStatusText()}
              </Badge>
              <span className="inline">
                {downloadService.formatFileSize(item.downloadedBytes)} / {downloadService.formatFileSize(item.totalBytes)}
              </span>
              {item.status === 'downloading' && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-primary-600 font-mono" aria-label={`下载速度: ${downloadService.formatSpeed(item.speed)}`}>
                        ⚡ {downloadService.formatSpeed(item.speed)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>下载速度</TooltipContent>
                  </Tooltip>
                  {item.peers !== undefined && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground ml-1" aria-label={`连接节点数: ${item.peers}`}>
                          👥 {item.peers}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>连接节点数</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {(item.status === 'downloading' || item.status === 'paused') && (
            <div className="flex-1 sm:w-32 md:w-48">
              <Progress 
                value={item.progress} 
                className="h-1.5 sm:h-2"
                aria-valuenow={item.progress}
                aria-label={`进度: ${Math.round(item.progress)}%`}
              />
            </div>
          )}
          <div className="flex justify-end items-center gap-1 md:gap-2" role="toolbar" aria-label="操作按钮">
            {getActions()}
          </div>
        </div>

        {item.error && (
          <div className="w-full mt-2 text-[10px] sm:text-xs text-error-600 bg-error-50 px-2 py-1 rounded-md overflow-hidden" role="alert" aria-live="polite">
            ❌ {item.error}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

const DownloadItem = React.memo(DownloadItemComponent);

export { DownloadItem };
export default DownloadItem;
