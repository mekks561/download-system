import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Separator,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/shadcn';
import { DownloadQueueService, QueueStatus, QueueStats } from '../services/DownloadQueueService';
import { Priority } from '../types';
import { formatBytes, formatSpeed, formatTime } from '../utils/format';

interface QueueState {
  queue: ReturnType<DownloadQueueService['getQueue']>;
  stats: QueueStats;
  status: QueueStatus;
}

const DownloadQueuePanel: React.FC = () => {
  const [queueState, setQueueState] = useState<QueueState>(() => {
    const service = DownloadQueueService.getInstance();
    return {
      queue: service.getQueue(),
      stats: service.getQueueStats(),
      status: service.getStatus(),
    };
  });

  const queueService = DownloadQueueService.getInstance();

  useEffect(() => {
    const unsubscribe = queueService.addListener((newQueue, newStats) => {
      setQueueState({
        queue: newQueue,
        stats: newStats,
        status: queueService.getStatus(),
      });
    });

    return unsubscribe;
  }, [queueService]);

  const { queue, stats, status } = queueState;

  const handleStartQueue = () => {
    queueService.startQueue();
  };

  const handlePauseQueue = () => {
    queueService.pauseQueue();
  };

  const handleStopQueue = () => {
    queueService.stopQueue();
  };

  const handleClearCompleted = () => {
    queueService.clearCompleted();
  };

  const handlePauseItem = (id: string) => {
    queueService.pauseItem(id);
  };

  const handleResumeItem = (id: string) => {
    queueService.resumeItem(id);
  };

  const handleCancelItem = (id: string) => {
    queueService.cancelItem(id);
  };

  const handleMoveToFront = (id: string) => {
    queueService.moveToFront(id);
  };

  const handleMoveToBack = (id: string) => {
    queueService.moveToBack(id);
  };

  const handleUpdatePriority = (id: string, priority: Priority) => {
    queueService.updatePriority(id, priority);
  };

  const priorityLabels: Record<Priority, { label: string; color: string }> = {
    urgent: { label: '紧急', color: 'bg-red-100 text-red-800' },
    high: { label: '高', color: 'bg-amber-100 text-amber-800' },
    normal: { label: '正常', color: 'bg-blue-100 text-blue-800' },
    low: { label: '低', color: 'bg-gray-100 text-gray-800' },
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: '等待中', color: 'text-gray-500' },
    downloading: { label: '下载中', color: 'text-primary-500' },
    paused: { label: '已暂停', color: 'text-amber-500' },
    completed: { label: '已完成', color: 'text-emerald-500' },
    error: { label: '错误', color: 'text-red-500' },
    cancelled: { label: '已取消', color: 'text-gray-400' },
  };

  const statusIcons: Record<string, string> = {
    pending: '⏳',
    downloading: '⬇️',
    paused: '⏸️',
    completed: '✅',
    error: '❌',
    cancelled: '🚫',
  };

  const sortedQueue = [...queue].sort((a, b) => {
    const statusOrder = { downloading: 0, pending: 1, paused: 2, error: 3, completed: 4, cancelled: 5 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }

    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              下载队列
            </CardTitle>
            <CardDescription>管理下载任务队列，支持智能调度和优先级管理</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {status === 'running' ? (
              <Button variant="secondary" size="sm" onClick={handlePauseQueue}>
                暂停队列
              </Button>
            ) : (
              <Button size="sm" onClick={handleStartQueue}>
                开始队列
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleStopQueue}>
              停止队列
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearCompleted}>
              清理完成
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">总任务</div>
              <div className="text-lg font-bold text-gray-800">{stats.total}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-500 mb-1">下载中</div>
              <div className="text-lg font-bold text-blue-600">{stats.downloading}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">等待中</div>
              <div className="text-lg font-bold text-gray-800">{stats.pending}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-amber-500 mb-1">已暂停</div>
              <div className="text-lg font-bold text-amber-600">{stats.paused}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-emerald-500 mb-1">总速度</div>
              <div className="text-lg font-bold text-emerald-600">{formatSpeed(stats.currentSpeed)}</div>
            </div>
          </div>

          {stats.downloading > 0 && stats.currentSpeed > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">预计剩余时间</span>
                <span className="text-sm font-medium text-gray-800">{formatTime(stats.estimatedTimeRemaining)}</span>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {sortedQueue.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl block mb-2">📭</span>
                <p>队列为空</p>
                <p className="text-sm">添加下载任务后会显示在这里</p>
              </div>
            ) : (
              sortedQueue.map((item) => (
                <div
                  key={item.downloadItem.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.status === 'downloading'
                      ? 'border-primary-200 bg-primary-50'
                      : item.status === 'error'
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xl">{statusIcons[item.status]}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.downloadItem.filename}</span>
                      <Badge className={priorityLabels[item.priority].color} variant="secondary">
                        {priorityLabels[item.priority].label}
                      </Badge>
                    </div>

                    {(item.status === 'downloading' || item.status === 'paused') && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{formatBytes(item.downloadItem.downloadedBytes || 0)} / {formatBytes(item.downloadItem.totalBytes || 0)}</span>
                          <span>{item.status === 'downloading' ? formatSpeed(item.downloadItem.speed || 0) : statusLabels[item.status].label}</span>
                        </div>
                        <Progress
                          value={item.downloadItem.progress || 0}
                          className="h-1.5"
                        />
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="mt-2 text-xs text-red-500">{item.error}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          ⋮
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleMoveToFront(item.downloadItem.id)}>
                          移到最前
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMoveToBack(item.downloadItem.id)}>
                          移到最后
                        </DropdownMenuItem>
                        <DropdownMenuContent className="absolute left-full top-0 ml-2">
                          <DropdownMenuItem onClick={() => handleUpdatePriority(item.downloadItem.id, 'urgent')}>
                            紧急
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePriority(item.downloadItem.id, 'high')}>
                            高优先级
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePriority(item.downloadItem.id, 'normal')}>
                            正常
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePriority(item.downloadItem.id, 'low')}>
                            低优先级
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {item.status === 'downloading' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handlePauseItem(item.downloadItem.id)}>
                            ⏸️
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>暂停</TooltipContent>
                      </Tooltip>
                    )}

                    {item.status === 'pending' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleResumeItem(item.downloadItem.id)}>
                            ▶️
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>开始</TooltipContent>
                      </Tooltip>
                    )}

                    {item.status === 'paused' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleResumeItem(item.downloadItem.id)}>
                            ▶️
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>继续</TooltipContent>
                      </Tooltip>
                    )}

                    {(item.status === 'downloading' || item.status === 'pending' || item.status === 'paused' || item.status === 'error') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleCancelItem(item.downloadItem.id)}>
                            🗑️
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>取消</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DownloadQueuePanel;