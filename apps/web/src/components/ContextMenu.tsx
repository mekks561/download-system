import React, { useState, useRef, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/shadcn/Dropdown';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose }) => {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (triggerRef.current) {
      triggerRef.current.style.left = `${x}px`;
      triggerRef.current.style.top = `${y}px`;
    }
  }, [x, y]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      onClose();
    }
  };

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled && !item.divider && item.action) {
      item.action();
      onClose();
    }
  };

  const renderItems = (menuItems: ContextMenuItem[]) => {
    let dividerCount = 0;
    return menuItems.map((item) => {
      if (item.divider) {
        dividerCount++;
        return <DropdownMenuSeparator key={`divider-${dividerCount}`} />;
      }

      const hasSubmenu = item.submenu && item.submenu.length > 0;

      if (hasSubmenu) {
        return (
          <DropdownMenuSub key={item.label}>
            <DropdownMenuSubTrigger
              className={item.danger ? 'text-red-500 focus:text-red-600' : ''}
              disabled={item.disabled}
            >
              {item.icon && (
                <span className="mr-2 w-5 text-center text-base">{item.icon}</span>
              )}
              <span className="flex-1">{item.label}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {renderItems(item.submenu ?? [])}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }

      return (
        <DropdownMenuItem
          key={item.label}
          disabled={item.disabled}
          onClick={() => handleItemClick(item)}
          className={item.danger ? 'text-red-500 focus:text-red-600' : ''}
        >
          {item.icon && (
            <span className="mr-2 w-5 text-center text-base">{item.icon}</span>
          )}
          <span className="flex-1">{item.label}</span>
        </DropdownMenuItem>
      );
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          className="fixed h-0 w-0 opacity-0"
          style={{ left: x, top: y }}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-[200px] rounded-xl p-2 shadow-xl"
        align="start"
        side="bottom"
        sideOffset={0}
        alignOffset={0}
        avoidCollisions={true}
        collisionPadding={10}
      >
        {renderItems(items)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{
    items: ContextMenuItem[];
    x: number;
    y: number;
  } | null>(null);

  const showContextMenu = (
    event: React.MouseEvent,
    items: ContextMenuItem[]
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const x = event.clientX;
    const y = event.clientY;

    setContextMenu({ items, x, y });
  };

  const hideContextMenu = () => {
    setContextMenu(null);
  };

  const ContextMenuComponent = contextMenu ? (
    <ContextMenu
      items={contextMenu.items}
      x={contextMenu.x}
      y={contextMenu.y}
      onClose={hideContextMenu}
    />
  ) : null;

  return {
    showContextMenu,
    hideContextMenu,
    ContextMenuComponent,
  };
};

export const createTaskContextMenu = (
  task: {
    id: string;
    filename: string;
    status: string;
  },
  actions: {
    onStart?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onCancel?: () => void;
    onDelete?: () => void;
    onOpenFile?: () => void;
    onOpenFolder?: () => void;
    onCopyUrl?: () => void;
    onAddToCategory?: () => void;
  }
): ContextMenuItem[] => {
  const items: ContextMenuItem[] = [];

  if (actions.onStart && ['pending', 'paused'].includes(task.status)) {
    items.push({
      label: '开始',
      icon: '▶',
      action: actions.onStart,
    });
  }

  if (actions.onPause && task.status === 'downloading') {
    items.push({
      label: '暂停',
      icon: '⏸',
      action: actions.onPause,
    });
  }

  if (actions.onResume && task.status === 'paused') {
    items.push({
      label: '继续',
      icon: '▶',
      action: actions.onResume,
    });
  }

  if (actions.onCancel && ['pending', 'downloading', 'paused'].includes(task.status)) {
    items.push({
      label: '取消',
      icon: '⏹',
      action: actions.onCancel,
    });
  }

  if (items.length > 0) {
    items.push({ label: '', icon: '', action: () => {}, divider: true });
  }

  if (actions.onOpenFile && task.status === 'completed') {
    items.push({
      label: '打开文件',
      icon: '📂',
      action: actions.onOpenFile,
    });
  }

  if (actions.onOpenFolder) {
    items.push({
      label: '打开文件夹',
      icon: '📁',
      action: actions.onOpenFolder,
    });
  }

  if (actions.onCopyUrl) {
    items.push({
      label: '复制链接',
      icon: '📋',
      action: actions.onCopyUrl,
    });
  }

  if (actions.onAddToCategory) {
    items.push({
      label: '添加到分类',
      icon: '📁',
      action: actions.onAddToCategory,
    });
  }

  if (items.length > 0) {
    items.push({ label: '', icon: '', action: () => {}, divider: true });
  }

  if (actions.onDelete) {
    items.push({
      label: '删除',
      icon: '🗑',
      action: actions.onDelete,
      danger: true,
    });
  }

  return items;
};

export default ContextMenu;
