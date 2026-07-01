import React, { useState, useMemo } from 'react';

export interface SelectableTask {
  id: string;
  filename: string;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'cancelled' | 'error';
  selected: boolean;
}

export interface BatchOperationsProps {
  tasks: SelectableTask[];
  onBatchStart: (ids: string[]) => void;
  onBatchPause: (ids: string[]) => void;
  onBatchResume: (ids: string[]) => void;
  onBatchCancel: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchAddCategory?: (ids: string[], categoryId: string) => void;
  categories?: Array<{ id: string; name: string }>;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  tasks,
  onBatchStart,
  onBatchPause,
  onBatchResume,
  onBatchCancel,
  onBatchDelete,
  onBatchAddCategory,
  categories = [],
}) => {
  const [showActions, setShowActions] = useState(false);

  const selectedTasks = useMemo(() => {
    return tasks.filter(task => task.selected);
  }, [tasks]);

  const selectedCount = selectedTasks.length;

  const handleSelectAll = () => {
    const allSelected = selectedCount === tasks.length;
    tasks.forEach(task => {
      task.selected = !allSelected;
    });
  };

  

  const handleBatchStart = () => {
    const pendingIds = selectedTasks
      .filter(t => t.status === 'pending' || t.status === 'paused')
      .map(t => t.id);
    if (pendingIds.length > 0) {
      onBatchStart(pendingIds);
    }
  };

  const handleBatchPause = () => {
    const downloadingIds = selectedTasks
      .filter(t => t.status === 'downloading')
      .map(t => t.id);
    if (downloadingIds.length > 0) {
      onBatchPause(downloadingIds);
    }
  };

  const handleBatchResume = () => {
    const pausedIds = selectedTasks
      .filter(t => t.status === 'paused')
      .map(t => t.id);
    if (pausedIds.length > 0) {
      onBatchResume(pausedIds);
    }
  };

  const handleBatchCancel = () => {
    const cancellableIds = selectedTasks
      .filter(t => ['pending', 'downloading', 'paused'].includes(t.status))
      .map(t => t.id);
    if (cancellableIds.length > 0) {
      onBatchCancel(cancellableIds);
    }
  };

  const handleBatchDelete = () => {
    if (selectedCount > 0) {
      const confirmDelete = window.confirm(
        `确定要删除选中的 ${selectedCount} 个任务吗？此操作无法撤销。`
      );
      if (confirmDelete) {
        const ids = selectedTasks.map(t => t.id);
        onBatchDelete(ids);
      }
    }
  };

  const handleBatchAddCategory = (categoryId: string) => {
    if (onBatchAddCategory && selectedCount > 0) {
      const ids = selectedTasks.map(t => t.id);
      onBatchAddCategory(ids, categoryId);
    }
  };

  const getAvailableActions = () => {
    const actions: Array<{
      label: string;
      icon: string;
      action: () => void;
      disabled: boolean;
      disabledReason?: string;
      variant: 'primary' | 'warning' | 'danger';
    }> = [];

    if (selectedCount === 0) {
      return actions;
    }

    const hasPendingOrPaused = selectedTasks.some(
      t => t.status === 'pending' || t.status === 'paused'
    );
    if (hasPendingOrPaused) {
      actions.push({
        label: '开始',
        icon: '▶',
        action: handleBatchStart,
        disabled: false,
        variant: 'primary',
      });
    }

    const hasDownloading = selectedTasks.some(t => t.status === 'downloading');
    if (hasDownloading) {
      actions.push({
        label: '暂停',
        icon: '⏸',
        action: handleBatchPause,
        disabled: false,
        variant: 'warning',
      });
    }

    const hasPaused = selectedTasks.some(t => t.status === 'paused');
    if (hasPaused) {
      actions.push({
        label: '继续',
        icon: '▶',
        action: handleBatchResume,
        disabled: false,
        variant: 'primary',
      });
    }

    const hasCancellable = selectedTasks.some(t =>
      ['pending', 'downloading', 'paused'].includes(t.status)
    );
    if (hasCancellable) {
      actions.push({
        label: '取消',
        icon: '⏹',
        action: handleBatchCancel,
        disabled: false,
        variant: 'warning',
      });
    }

    if (selectedCount > 0) {
      actions.push({
        label: '删除',
        icon: '🗑',
        action: handleBatchDelete,
        disabled: false,
        variant: 'danger',
      });
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <div style={styles.container}>
      <div style={styles.selectionBar}>
        <div style={styles.selectAllContainer}>
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={selectedCount === tasks.length && tasks.length > 0}
            onChange={handleSelectAll}
            disabled={tasks.length === 0}
          />
          <span style={styles.selectAllLabel}>
            全选 {tasks.length > 0 && `(${selectedCount}/${tasks.length})`}
          </span>
        </div>

        {selectedCount > 0 && (
          <div style={styles.selectedInfo}>
            <span style={styles.selectedCount}>
              已选择 <strong>{selectedCount}</strong> 个任务
            </span>
            <button
              style={styles.clearButton}
              onClick={() => tasks.forEach(t => (t.selected = false))}
            >
              清除选择
            </button>
          </div>
        )}

        <div style={styles.actions}>
          <button
            style={styles.toggleButton}
            onClick={() => setShowActions(!showActions)}
            disabled={selectedCount === 0}
          >
            ⚡ 批量操作
            {selectedCount > 0 && (
              <span style={styles.badge}>{selectedCount}</span>
            )}
          </button>

          {showActions && actions.length > 0 && (
            <div style={styles.actionsDropdown}>
              {actions.map((action, index) => (
                <button
                  key={index}
                  style={{
                    ...styles.actionButton,
                    ...(action.variant === 'primary' ? styles.actionButtonPrimary : {}),
                    ...(action.variant === 'warning' ? styles.actionButtonWarning : {}),
                    ...(action.variant === 'danger' ? styles.actionButtonDanger : {}),
                  }}
                  onClick={action.action}
                  disabled={action.disabled}
                  title={action.disabledReason}
                >
                  <span style={styles.actionIcon}>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}

              {onBatchAddCategory && categories.length > 0 && (
                <div style={styles.categorySection}>
                  <div style={styles.categoryDivider}></div>
                  <div style={styles.categoryLabel}>添加到分类</div>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      style={styles.categoryButton}
                      onClick={() => handleBatchAddCategory(category.id)}
                    >
                      📁 {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedCount > 0 && (
        <div style={styles.quickActions}>
          {actions.slice(0, 4).map((action, index) => (
            <button
              key={index}
              style={{
                ...styles.quickActionButton,
                ...(action.variant === 'primary' ? styles.quickActionPrimary : {}),
                ...(action.variant === 'warning' ? styles.quickActionWarning : {}),
                ...(action.variant === 'danger' ? styles.quickActionDanger : {}),
              }}
              onClick={action.action}
              disabled={action.disabled}
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginBottom: '16px',
  },
  selectionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  selectAllContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  selectAllLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  selectedCount: {
    fontSize: '14px',
    color: '#1a1a2e',
  },
  clearButton: {
    padding: '6px 12px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  actions: {
    position: 'relative',
    display: 'flex',
    gap: '8px',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
  },
  actionsDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    padding: '8px',
    minWidth: '200px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  actionButtonPrimary: {
    color: '#3b82f6',
  },
  actionButtonWarning: {
    color: '#f59e0b',
  },
  actionButtonDanger: {
    color: '#ef4444',
  },
  actionIcon: {
    fontSize: '16px',
  },
  categorySection: {
    marginTop: '8px',
  },
  categoryDivider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '8px 0',
  },
  categoryLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '600',
    padding: '4px 14px',
    textTransform: 'uppercase',
  },
  categoryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  quickActionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  quickActionPrimary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },
  quickActionWarning: {
    backgroundColor: '#f59e0b',
    color: 'white',
    borderColor: '#f59e0b',
  },
  quickActionDanger: {
    backgroundColor: '#ef4444',
    color: 'white',
    borderColor: '#ef4444',
  },
};

export default BatchOperations;
