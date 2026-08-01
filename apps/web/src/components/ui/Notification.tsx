import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from './shadcn';
import { Button } from './shadcn';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationProps {
  type?: NotificationType;
  message: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  onClose?: () => void;
  icon?: React.ReactNode;
}

export interface NotificationOptions {
  type?: NotificationType;
  message: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  onClose?: () => void;
}

interface NotificationItemProps extends NotificationOptions {
  id: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type = 'info',
  message,
  description,
  duration = 4000,
  onClose,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, handleClose]);

  return (
    <Alert
      variant={type === 'error' ? 'destructive' : 'default'}
      className={`transition-all duration-300 ${isClosing ? 'opacity-0 translate-x-full' : ''}`}
      key={id}
    >
      <AlertTitle>{message}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
      <Button variant="ghost" size="sm" onClick={handleClose} className="ml-auto">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </Button>
    </Alert>
  );
};

let notificationList: NotificationItemProps[] = [];
let listeners: ((list: NotificationItemProps[]) => void)[] = [];

const notify = (options: NotificationOptions): string => {
  const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newItem: NotificationItemProps = { id, ...options };
  notificationList = [...notificationList, newItem];
  notifyListeners();
  return id;
};

const remove = (id: string) => {
  notificationList = notificationList.filter((item) => item.id !== id);
  notifyListeners();
};

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...notificationList]));
};

const subscribe = (listener: (list: NotificationItemProps[]) => void) => {
  listeners.push(listener);
  listener([...notificationList]);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

export const notification = {
  success: (options: Omit<NotificationOptions, 'type'>) => notify({ ...options, type: 'success' }),
  error: (options: Omit<NotificationOptions, 'type'>) => notify({ ...options, type: 'error' }),
  warning: (options: Omit<NotificationOptions, 'type'>) => notify({ ...options, type: 'warning' }),
  info: (options: Omit<NotificationOptions, 'type'>) => notify({ ...options, type: 'info' }),
  remove,
};

const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItemProps[]>([]);

  useEffect(() => {
    return subscribe(setNotifications);
  }, []);

  const handleClose = (id: string) => {
    remove(id);
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((item) => (
        <NotificationItem key={item.id} {...item} onClose={() => handleClose(item.id)} />
      ))}
    </div>
  );
};

export default NotificationContainer;