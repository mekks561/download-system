import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onSearch?: () => void;
  onToggleSidebar?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const target = event.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (isCtrlOrCmd && !isInputFocused) {
      switch (event.key.toLowerCase()) {
        case 'enter':
          event.preventDefault();
          handlers.onStart?.();
          break;
        case 'p':
          event.preventDefault();
          handlers.onPause?.();
          break;
        case 'r':
          event.preventDefault();
          handlers.onResume?.();
          break;
        case 'd':
          event.preventDefault();
          handlers.onDelete?.();
          break;
        case 'a':
          event.preventDefault();
          handlers.onSelectAll?.();
          break;
        case 'f':
          event.preventDefault();
          handlers.onSearch?.();
          break;
        case 'b':
          event.preventDefault();
          handlers.onToggleSidebar?.();
          break;
      }
    }

    if (!isInputFocused) {
      switch (event.key) {
        case 'Delete':
          event.preventDefault();
          handlers.onDelete?.();
          break;
        case 'Backspace':
          event.preventDefault();
          handlers.onDelete?.();
          break;
      }
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export const SHORTCUTS = [
  { key: 'Ctrl/Cmd + Enter', description: '开始选中的下载' },
  { key: 'Ctrl/Cmd + P', description: '暂停选中的下载' },
  { key: 'Ctrl/Cmd + R', description: '继续选中的下载' },
  { key: 'Ctrl/Cmd + D', description: '删除选中的下载' },
  { key: 'Ctrl/Cmd + A', description: '全选下载项' },
  { key: 'Ctrl/Cmd + F', description: '聚焦搜索框' },
  { key: 'Ctrl/Cmd + B', description: '切换侧边栏' },
  { key: 'Delete / Backspace', description: '删除选中的下载' },
];
