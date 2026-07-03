import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/shadcn';
import { Button } from './ui/shadcn';
import { Progress } from './ui/shadcn';
import { Label } from './ui/shadcn';

export type TaskStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed';

export interface Task {
  id: string;
  name: string;
  url?: string;
  status: TaskStatus;
  progress: number;
  speed?: number;
  size: number;
  downloaded: number;
  priority: number;
  category?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  retries: number;
  maxRetries: number;
}

export interface TaskQueueProps {
  tasks: Task[];
  onTaskAction: (taskId: string, action: 'start' | 'pause' | 'resume' | 'cancel' | 'retry' | 'remove') => void;
  onQueueAction?: (action: 'pauseAll' | 'resumeAll' | 'clearCompleted' | 'clearAll') => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onPriorityChange?: (taskId: string, newPriority: number) => void;
  maxConcurrent?: number;
  showControls?: boolean;
  compact?: boolean;
}

const TaskQueue: React.FC<TaskQueueProps> = ({
  tasks,
  onTaskAction,
  onQueueAction,
  onReorder,
  onPriorityChange,
  maxConcurrent = 3,
  showControls = true,
  compact = false
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [concurrentCount, setConcurrentCount] = useState(maxConcurrent);

  const queueStats = useMemo(() => {
    const stats = {
      total: tasks.length,
      pending: 0,
      downloading: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      totalSize: 0,
      downloadedSize: 0,
      averageSpeed: 0,
      estimatedTime: 0
    };

    let totalSpeed = 0;
    let speedCount = 0;

    tasks.forEach(task => {
      stats.totalSize += task.size;
      stats.downloadedSize += task.downloaded;
      
      switch (task.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'downloading':
          stats.downloading++;
          if (task.speed) {
            totalSpeed += task.speed;
            speedCount++;
          }
          break;
        case 'paused':
          stats.paused++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    });

    if (speedCount > 0) {
      stats.averageSpeed = Math.round(totalSpeed / speedCount);
    }

    const remainingSize = stats.totalSize - stats.downloadedSize;
    if (stats.averageSpeed > 0) {
      stats.estimatedTime = Math.ceil(remainingSize / stats.averageSpeed);
    }

    return stats;
  }, [tasks]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index && onReorder) {
      onReorder(draggedIndex, index);
      setDraggedIndex(index);
    }
  }, [draggedIndex, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusIcon = (status: TaskStatus): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'downloading': return '⬇️';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '📄';
    }
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 8) return '极高';
    if (priority >= 6) return '高';
    if (priority >= 4) return '中';
    if (priority >= 2) return '低';
    return '极低';
  };

  const adjustPriority = (taskId: string, delta: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newPriority = Math.max(1, Math.min(10, task.priority + delta));
      onPriorityChange?.(taskId, newPriority);
    }
  };

  const renderTaskItem = (task: Task, index: number) => {
    const isDragging = draggedIndex === index;
    const progressPercent = task.size > 0 ? (task.downloaded / task.size) * 100 : 0;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
        className={`border-b border-gray-200 transition-all duration-200 cursor-grab ${
          isDragging ? 'opacity-50 bg-gray-100' : ''
        } ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}
      >
        <div className="flex items-center gap-3">
          <div className="text-gray-400 text-base p-1 cursor-grab" title="拖拽调整顺序">
            ⋮⋮
          </div>
          
          <div className="text-2xl flex-shrink-0">
            {getStatusIcon(task.status)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{task.name}</div>
            {task.url && !compact && (
              <div className="text-xs text-gray-500 mt-1 truncate">{task.url}</div>
            )}
          </div>

          <div className="flex gap-1 flex-shrink-0">
            {task.status === 'pending' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onTaskAction(task.id, 'start')}
                title="开始"
              >
                ▶️
              </Button>
            )}
            {task.status === 'downloading' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onTaskAction(task.id, 'pause')}
                title="暂停"
              >
                ⏸️
              </Button>
            )}
            {task.status === 'paused' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onTaskAction(task.id, 'resume')}
                title="继续"
              >
                ▶️
              </Button>
            )}
            {task.status === 'failed' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onTaskAction(task.id, 'retry')}
                title="重试"
              >
                🔄
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => onTaskAction(task.id, 'cancel')}
              title="取消"
            >
              🗑️
            </Button>
          </div>
        </div>

        {!compact && (
          <>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <Progress value={progressPercent} className="h-1.5" />
              </div>
              <span className="text-sm font-semibold text-gray-700 min-w-12 text-right">
                {progressPercent.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="font-semibold">大小：</span>
                <span>{formatSize(task.size)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="font-semibold">已下载：</span>
                <span>{formatSize(task.downloaded)}</span>
              </div>
              {task.status === 'downloading' && task.speed && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-semibold">速度：</span>
                  <span className="text-green-600 font-semibold">{formatSpeed(task.speed)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="font-semibold">优先级：</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 text-xs"
                    onClick={() => adjustPriority(task.id, -1)}
                    disabled={task.priority <= 1}
                  >
                    -
                  </Button>
                  <span className="text-xs text-gray-700 min-w-16 text-center">
                    {getPriorityLabel(task.priority)} ({task.priority})
                  </span>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 text-xs"
                    onClick={() => adjustPriority(task.id, 1)}
                    disabled={task.priority >= 10}
                  >
                    +
                  </Button>
                </div>
              </div>
              {task.retries !== undefined && task.maxRetries > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-semibold">重试：</span>
                  <span>{task.retries}/{task.maxRetries}</span>
                </div>
              )}
            </div>

            {task.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                ⚠️ {task.error}
              </div>
            )}
          </>
        )}

        {compact && task.status === 'downloading' && (
          <div className="mt-2">
            <Progress value={progressPercent} className="h-1" />
          </div>
        )}
      </div>
    );
  };

  const totalProgressPercent = queueStats.totalSize > 0 
    ? (queueStats.downloadedSize / queueStats.totalSize) * 100 
    : 0;

  return (
    <Card className="w-full overflow-hidden">
      {showControls && (
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <div className="mb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-4">📋 任务队列</CardTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="block text-2xl font-bold text-gray-900 mb-1">{queueStats.total}</span>
                <span className="text-xs text-gray-500">总任务</span>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="block text-2xl font-bold text-gray-900 mb-1">{queueStats.downloading}</span>
                <span className="text-xs text-gray-500">下载中</span>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="block text-2xl font-bold text-gray-900 mb-1">{queueStats.pending}</span>
                <span className="text-xs text-gray-500">等待中</span>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="block text-2xl font-bold text-gray-900 mb-1">{queueStats.completed}</span>
                <span className="text-xs text-gray-500">已完成</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-semibold text-gray-700">并发数：</Label>
              <input
                type="range"
                min="1"
                max="10"
                value={concurrentCount}
                onChange={(e) => setConcurrentCount(parseInt(e.target.value))}
                className="w-28 cursor-pointer"
              />
              <span className="text-base font-semibold text-primary-500 min-w-6">{concurrentCount}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant={isPaused ? 'default' : 'secondary'}
                onClick={() => {
                  setIsPaused(!isPaused);
                  onQueueAction?.(isPaused ? 'resumeAll' : 'pauseAll');
                }}
              >
                {isPaused ? '▶️ 继续全部' : '⏸️ 暂停全部'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onQueueAction?.('clearCompleted')}
              >
                🗑️ 清除已完成
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      {queueStats.downloading > 0 && !compact && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-5 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>📊 总进度：</span>
            <div className="w-48 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${totalProgressPercent}%` }}
              />
            </div>
            <span>{totalProgressPercent.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>⚡ 平均速度：</span>
            <span className="text-green-600 font-semibold">{formatSpeed(queueStats.averageSpeed)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>⏱️ 预计剩余：</span>
            <span>{formatTime(queueStats.estimatedTime)}</span>
          </div>
        </div>
      )}

      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-5 text-gray-400">
              <span className="text-6xl mb-4">📭</span>
              <p>暂无任务</p>
            </div>
          ) : (
            tasks.map((task, index) => renderTaskItem(task, index))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskQueue;
