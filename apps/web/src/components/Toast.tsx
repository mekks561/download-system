import React, { createContext, use, useState, useCallback, ReactNode } from 'react';

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
    <ToastContext value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext>
  );
};

export const useToast = (): ToastContextType => {
  const context = use(ToastContext);
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
    <div className="fixed top-5 right-5 flex flex-col gap-3 z-[10001] max-w-sm">
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
      bgClass: 'bg-green-50',
      borderClass: 'border-green-300',
      textClass: 'text-green-800'
    },
    error: {
      icon: '❌',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-300',
      textClass: 'text-red-800'
    },
    warning: {
      icon: '⚠️',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-300',
      textClass: 'text-amber-800'
    },
    info: {
      icon: 'ℹ️',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-300',
      textClass: 'text-blue-800'
    }
  };

  const config = typeConfig[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border shadow-md backdrop-blur-sm ${config.bgClass} ${config.borderClass} animate-[slideInRight_0.3s_ease-out]`}
    >
      <span className="text-lg flex-shrink-0">{config.icon}</span>
      <span className={`flex-1 text-sm font-medium leading-relaxed ${config.textClass}`}>
        {toast.message}
      </span>
      <button
        className="bg-transparent border-0 text-xl text-gray-400 cursor-pointer p-0 leading-none flex-shrink-0 hover:text-gray-600 transition-colors"
        onClick={() => onHide(toast.id)}
      >
        ×
      </button>
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

export default ToastContainer;
