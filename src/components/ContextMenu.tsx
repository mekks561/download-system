import React, { useState, useEffect, useRef } from 'react';

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

export interface ContextMenuProviderProps {
  children: React.ReactNode;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuIndex, setSubmenuIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled && !item.divider && item.action) {
      item.action();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      style={styles.menu}
      className="context-menu"
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={index} style={styles.divider} />;
        }

        const hasSubmenu = item.submenu && item.submenu.length > 0;

        return (
          <div
            key={index}
            style={{
              ...styles.menuItem,
              ...(item.disabled ? styles.menuItemDisabled : {}),
              ...(item.danger ? styles.menuItemDanger : {}),
            }}
            onMouseEnter={() => hasSubmenu && setSubmenuIndex(index)}
            onMouseLeave={() => hasSubmenu && setSubmenuIndex(null)}
          >
            <button
              style={styles.menuItemButton}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && <span style={styles.icon}>{item.icon}</span>}
              <span style={styles.label}>{item.label}</span>
              {hasSubmenu && <span style={styles.submenuArrow}>▶</span>}
            </button>

            {hasSubmenu && submenuIndex === index && (
              <div style={styles.submenu}>
                {item.submenu!.map((subItem, subIndex) => (
                  <button
                    key={subIndex}
                    style={{
                      ...styles.menuItemButton,
                      ...(subItem.disabled ? styles.menuItemDisabled : {}),
                      ...(subItem.danger ? styles.menuItemDanger : {}),
                    }}
                    onClick={() => handleItemClick(subItem)}
                    disabled={subItem.disabled}
                  >
                    {subItem.icon && <span style={styles.icon}>{subItem.icon}</span>}
                    <span style={styles.label}>{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .context-menu {
          animation: fadeIn 0.1s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
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

const styles: { [key: string]: React.CSSProperties } = {
  menu: {
    position: 'fixed',
    minWidth: '200px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    padding: '8px',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  menuItem: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  menuItemButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1a1a2e',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s',
    fontWeight: '500',
  },
  menuItemDisabled: {
    color: '#d1d5db',
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  menuItemDanger: {
    color: '#ef4444',
  },
  icon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  label: {
    flex: 1,
  },
  submenuArrow: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '4px 0',
  },
  submenu: {
    position: 'absolute',
    left: '100%',
    top: 0,
    marginLeft: '4px',
    minWidth: '180px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
};

export default ContextMenu;
