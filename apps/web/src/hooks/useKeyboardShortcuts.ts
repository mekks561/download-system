import { useEffect, useCallback, useRef } from 'react';

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
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const target = event.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    const currentHandlers = handlersRef.current;

    if (isCtrlOrCmd && !isInputFocused) {
      switch (event.key.toLowerCase()) {
        case 'enter':
          event.preventDefault();
          currentHandlers.onStart?.();
          break;
        case 'p':
          event.preventDefault();
          currentHandlers.onPause?.();
          break;
        case 'r':
          event.preventDefault();
          currentHandlers.onResume?.();
          break;
        case 'd':
          event.preventDefault();
          currentHandlers.onDelete?.();
          break;
        case 'a':
          event.preventDefault();
          currentHandlers.onSelectAll?.();
          break;
        case 'f':
          event.preventDefault();
          currentHandlers.onSearch?.();
          break;
        case 'b':
          event.preventDefault();
          currentHandlers.onToggleSidebar?.();
          break;
      }
    }

    if (!isInputFocused) {
      switch (event.key) {
        case 'Delete':
          event.preventDefault();
          currentHandlers.onDelete?.();
          break;
        case 'Backspace':
          event.preventDefault();
          currentHandlers.onDelete?.();
          break;
      }
    }
  }, []);

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
