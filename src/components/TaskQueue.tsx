import React, { useState, useMemo, useCallback } from 'react';

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
  maxConcurrent?: number;
  showControls?: boolean;
  compact?: boolean;
}

const TaskQueue: React.FC<TaskQueueProps> = ({
  tasks,
  onTaskAction,
  onQueueAction,
  onReorder,
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

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'pending': return '#6b7280';
      case 'downloading': return '#3b82f6';
      case 'paused': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
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
      console.log(`调整任务 ${taskId} 优先级: ${task.priority} -> ${newPriority}`);
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
        style={{
          ...styles.taskItem,
          ...(isDragging ? styles.taskItemDragging : {}),
          ...(compact ? styles.taskItemCompact : {})
        }}
      >
        <div style={styles.taskHeader}>
          <div style={styles.dragHandle} title="拖拽调整顺序">
            ⋮⋮
          </div>
          
          <div style={styles.taskIcon}>
            {getStatusIcon(task.status)}
          </div>
          
          <div style={styles.taskInfo}>
            <div style={styles.taskName}>{task.name}</div>
            {task.url && !compact && (
              <div style={styles.taskUrl}>{task.url}</div>
            )}
          </div>

          <div style={styles.taskActions}>
            {task.status === 'pending' && (
              <button
                style={styles.actionButton}
                onClick={() => onTaskAction(task.id, 'start')}
                title="开始"
              >
                ▶️
              </button>
            )}
            {task.status === 'downloading' && (
              <button
                style={styles.actionButton}
                onClick={() => onTaskAction(task.id, 'pause')}
                title="暂停"
              >
                ⏸️
              </button>
            )}
            {task.status === 'paused' && (
              <button
                style={styles.actionButton}
                onClick={() => onTaskAction(task.id, 'resume')}
                title="继续"
              >
                ▶️
              </button>
            )}
            {task.status === 'failed' && (
              <button
                style={styles.actionButton}
                onClick={() => onTaskAction(task.id, 'retry')}
                title="重试"
              >
                🔄
              </button>
            )}
            <button
              style={styles.actionButton}
              onClick={() => onTaskAction(task.id, 'cancel')}
              title="取消"
            >
              🗑️
            </button>
          </div>
        </div>

        {!compact && (
          <>
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPercent}%`,
                    backgroundColor: getStatusColor(task.status)
                  }}
                />
              </div>
              <span style={styles.progressText}>
                {progressPercent.toFixed(1)}%
              </span>
            </div>

            <div style={styles.taskDetails}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>大小：</span>
                <span>{formatSize(task.size)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>已下载：</span>
                <span>{formatSize(task.downloaded)}</span>
              </div>
              {task.status === 'downloading' && task.speed && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>速度：</span>
                  <span style={styles.speedText}>{formatSpeed(task.speed)}</span>
                </div>
              )}
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>优先级：</span>
                <div style={styles.priorityControl}>
                  <button
                    style={styles.priorityButton}
                    onClick={() => adjustPriority(task.id, -1)}
                    disabled={task.priority <= 1}
                  >
                    -
                  </button>
                  <span style={styles.priorityValue}>
                    {getPriorityLabel(task.priority)} ({task.priority})
                  </span>
                  <button
                    style={styles.priorityButton}
                    onClick={() => adjustPriority(task.id, 1)}
                    disabled={task.priority >= 10}
                  >
                    +
                  </button>
                </div>
              </div>
              {task.retries !== undefined && task.maxRetries > 0 && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>重试：</span>
                  <span>{task.retries}/{task.maxRetries}</span>
                </div>
              )}
            </div>

            {task.error && (
              <div style={styles.errorMessage}>
                ⚠️ {task.error}
              </div>
            )}
          </>
        )}

        {compact && task.status === 'downloading' && (
          <div style={styles.compactProgress}>
            <div
              style={{
                ...styles.compactProgressFill,
                width: `${progressPercent}%`,
                backgroundColor: getStatusColor(task.status)
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {showControls && (
        <div style={styles.header}>
          <div style={styles.statsSection}>
            <h3 style={styles.title}>📋 任务队列</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{queueStats.total}</span>
                <span style={styles.statLabel}>总任务</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{queueStats.downloading}</span>
                <span style={styles.statLabel}>下载中</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{queueStats.pending}</span>
                <span style={styles.statLabel}>等待中</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{queueStats.completed}</span>
                <span style={styles.statLabel}>已完成</span>
              </div>
            </div>
          </div>

          <div style={styles.controlsSection}>
            <div style={styles.concurrentControl}>
              <label style={styles.controlLabel}>并发数：</label>
              <input
                type="range"
                min="1"
                max="10"
                value={concurrentCount}
                onChange={(e) => setConcurrentCount(parseInt(e.target.value))}
                style={styles.rangeInput}
              />
              <span style={styles.concurrentValue}>{concurrentCount}</span>
            </div>

            <div style={styles.queueActions}>
              <button
                style={{
                  ...styles.queueButton,
                  backgroundColor: isPaused ? '#10b981' : '#f59e0b'
                }}
                onClick={() => {
                  setIsPaused(!isPaused);
                  onQueueAction?.(isPaused ? 'resumeAll' : 'pauseAll');
                }}
              >
                {isPaused ? '▶️ 继续全部' : '⏸️ 暂停全部'}
              </button>
              <button
                style={styles.queueButton}
                onClick={() => onQueueAction?.('clearCompleted')}
              >
                🗑️ 清除已完成
              </button>
            </div>
          </div>
        </div>
      )}

      {queueStats.downloading > 0 && !compact && (
        <div style={styles.overview}>
          <div style={styles.overviewItem}>
            <span>📊 总进度：</span>
            <div style={styles.overviewProgress}>
              <div
                style={{
                  ...styles.overviewProgressFill,
                  width: `${queueStats.totalSize > 0 ? (queueStats.downloadedSize / queueStats.totalSize) * 100 : 0}%`
                }}
              />
            </div>
            <span>{queueStats.totalSize > 0 ? ((queueStats.downloadedSize / queueStats.totalSize) * 100).toFixed(1) : 0}%</span>
          </div>
          <div style={styles.overviewItem}>
            <span>⚡ 平均速度：</span>
            <span style={styles.speedText}>{formatSpeed(queueStats.averageSpeed)}</span>
          </div>
          <div style={styles.overviewItem}>
            <span>⏱️ 预计剩余：</span>
            <span>{formatTime(queueStats.estimatedTime)}</span>
          </div>
        </div>
      )}

      <div style={styles.taskList}>
        {tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <p>暂无任务</p>
          </div>
        ) : (
          tasks.map((task, index) => renderTaskItem(task, index))
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  statsSection: {
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  statItem: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  controlsSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  concurrentControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  controlLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  rangeInput: {
    width: '120px',
    cursor: 'pointer',
  },
  concurrentValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#3b82f6',
    minWidth: '24px',
  },
  queueActions: {
    display: 'flex',
    gap: '8px',
  },
  queueButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  overview: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#eff6ff',
    borderBottom: '1px solid #dbeafe',
  },
  overviewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
  },
  overviewProgress: {
    width: '200px',
    height: '8px',
    backgroundColor: '#dbeafe',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  overviewProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
  },
  speedText: {
    color: '#10b981',
    fontWeight: '600',
  },
  taskList: {
    maxHeight: '600px',
    overflowY: 'auto',
  },
  taskItem: {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    transition: 'all 0.2s',
    cursor: 'grab',
  },
  taskItemDragging: {
    opacity: 0.5,
    backgroundColor: '#f3f4f6',
  },
  taskItemCompact: {
    padding: '12px 16px',
  },
  taskHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  dragHandle: {
    cursor: 'grab',
    color: '#9ca3af',
    fontSize: '16px',
    padding: '4px',
  },
  taskIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  taskUrl: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  taskActions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
  },
  actionButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.2s',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    minWidth: '48px',
    textAlign: 'right',
  },
  taskDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#6b7280',
  },
  detailLabel: {
    fontWeight: '600',
  },
  priorityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  priorityButton: {
    width: '24px',
    height: '24px',
    backgroundColor: '#e5e7eb',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityValue: {
    fontSize: '12px',
    color: '#374151',
    minWidth: '60px',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#dc2626',
  },
  compactProgress: {
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  compactProgressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
};

export default TaskQueue;
