import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Notification.css';

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

const icons: Record<NotificationType, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="16 10 10 16 8 14" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const typeStyles: Record<NotificationType, string> = {
  success: 'notification-success',
  error: 'notification-error',
  warning: 'notification-warning',
  info: 'notification-info',
};

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
    <div className={`notification ${typeStyles[type]} ${isClosing ? 'notification-closing' : ''}`} key={id}>
      <span className="notification-icon">{icons[type]}</span>
      <div className="notification-content">
        <div className="notification-message">{message}</div>
        {description && <div className="notification-description">{description}</div>}
      </div>
      <button className="notification-close" onClick={handleClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
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
    <div className="notification-container">
      {notifications.map((item) => (
        <NotificationItem key={item.id} {...item} onClose={() => handleClose(item.id)} />
      ))}
    </div>
  );
};

export default NotificationContainer;