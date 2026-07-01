import React, { useEffect } from 'react';
import { KeyboardShortcut } from '../hooks/useKeyboardShortcuts';

interface ShortcutHelpModalProps {
  shortcuts: KeyboardShortcut[];
  onClose: () => void;
}

const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({
  shortcuts,
  onClose,
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('⌘');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>⌨️ 键盘快捷键</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {shortcuts.map((shortcut, index) => (
            <div key={index} style={styles.shortcutItem}>
              <div style={styles.shortcutKeys}>
                {formatShortcut(shortcut)}
              </div>
              <div style={styles.shortcutDescription}>
                {shortcut.description}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            按 <kbd style={styles.kbd}>?</kbd> 或点击关闭
          </p>
        </div>
      </div>
    </div>
  );
};

export { ShortcutHelpModal };
export default ShortcutHelpModal;

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    width: '500px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#fee',
    color: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    fontSize: '24px',
    lineHeight: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  },
  shortcutItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  shortcutKeys: {
    display: 'flex',
    gap: '6px',
  },
  shortcutDescription: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    textAlign: 'center',
  },
  footerText: {
    margin: 0,
    fontSize: '13px',
    color: '#6b7280',
  },
  kbd: {
    padding: '2px 6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
};
