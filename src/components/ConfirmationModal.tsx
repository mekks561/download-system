import React, { useEffect } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
  loading = false
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: '⚠️',
      color: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      buttonColor: '#dc2626'
    },
    warning: {
      icon: '⚡',
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      buttonColor: '#d97706'
    },
    info: {
      icon: '💡',
      color: '#2563eb',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
      buttonColor: '#2563eb'
    }
  };

  const config = typeConfig[type];

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ ...styles.iconWrapper, backgroundColor: config.bgColor }}>
            <span style={styles.icon}>{config.icon}</span>
          </div>
          <h2 style={styles.title}>{title}</h2>
        </div>

        <div style={styles.content}>
          <p style={styles.message}>{message}</p>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.cancelButton}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            style={{
              ...styles.confirmButton,
              backgroundColor: config.buttonColor
            }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

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
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    width: '450px',
    maxWidth: '90vw',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    animation: 'slideUp 0.3s ease-out',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px 16px',
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  icon: {
    fontSize: '32px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a2e',
    textAlign: 'center' as const,
  },
  content: {
    padding: '0 24px 24px',
  },
  message: {
    margin: 0,
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px 24px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  confirmButton: {
    flex: 1,
    padding: '12px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default ConfirmationModal;
