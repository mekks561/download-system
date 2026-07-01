import { useEffect, useCallback, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export const useKeyboardShortcuts = ({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) => {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      if (event.key === '?' && event.shiftKey) {
        event.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatches = shortcut.meta ? event.metaKey : !event.metaKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return { showHelp, setShowHelp };
};

export const createDefaultShortcuts = (
  actions: {
    newDownload?: () => void;
    clearCompleted?: () => void;
    search?: () => void;
    openSettings?: () => void;
    toggleTheme?: () => void;
    selectAll?: () => void;
    escape?: () => void;
  }
): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.newDownload) {
    shortcuts.push({
      key: 'n',
      ctrl: true,
      action: actions.newDownload,
      description: '新建下载任务',
    });
  }

  if (actions.clearCompleted) {
    shortcuts.push({
      key: 'c',
      ctrl: true,
      shift: true,
      action: actions.clearCompleted,
      description: '清空已完成任务',
    });
  }

  if (actions.search) {
    shortcuts.push({
      key: 'f',
      ctrl: true,
      action: actions.search,
      description: '搜索',
    });
  }

  if (actions.openSettings) {
    shortcuts.push({
      key: ',',
      ctrl: true,
      action: actions.openSettings,
      description: '打开设置',
    });
  }

  if (actions.toggleTheme) {
    shortcuts.push({
      key: 't',
      ctrl: true,
      action: actions.toggleTheme,
      description: '切换主题',
    });
  }

  if (actions.selectAll) {
    shortcuts.push({
      key: 'a',
      ctrl: true,
      action: actions.selectAll,
      description: '全选',
    });
  }

  if (actions.escape) {
    shortcuts.push({
      key: 'Escape',
      action: actions.escape,
      description: '取消当前操作',
    });
  }

  return shortcuts;
};
