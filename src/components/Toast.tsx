import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((
    message: string, 
    type: Toast['type'] = 'info', 
    duration: number = 3000
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastContainerProps {
  toasts: Toast[];
  onHide: (id: string) => void;
}

const ToastContainer = React.memo(({ toasts, onHide }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onHide={onHide} />
      ))}
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';

interface ToastItemProps {
  toast: Toast;
  onHide: (id: string) => void;
}

const ToastItem = React.memo(({ toast, onHide }: ToastItemProps) => {
  const typeConfig = {
    success: {
      icon: '✅',
      backgroundColor: '#dcfce7',
      borderColor: '#86efac',
      color: '#166534'
    },
    error: {
      icon: '❌',
      backgroundColor: '#fee2e2',
      borderColor: '#fca5a5',
      color: '#991b1b'
    },
    warning: {
      icon: '⚠️',
      backgroundColor: '#fef3c7',
      borderColor: '#fcd34d',
      color: '#92400e'
    },
    info: {
      icon: 'ℹ️',
      backgroundColor: '#dbeafe',
      borderColor: '#93c5fd',
      color: '#1e40af'
    }
  };

  const config = typeConfig[toast.type];

  return (
    <div
      style={{
        ...styles.toast,
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor
      }}
    >
      <span style={styles.toastIcon}>{config.icon}</span>
      <span style={{ ...styles.toastMessage, color: config.color }}>
        {toast.message}
      </span>
      <button
        style={styles.closeButton}
        onClick={() => onHide(toast.id)}
      >
        ×
      </button>
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 10001,
    maxWidth: '400px',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    animation: 'slideInRight 0.3s ease-out',
    backdropFilter: 'blur(10px)',
  },
  toastIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  toastMessage: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.5',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0',
    lineHeight: '1',
    flexShrink: 0,
  },
};

export default ToastContainer;
