import React from 'react';
import { DownloadNotification } from '../types';

interface NotificationProps {
  notification: DownloadNotification;
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const getColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="notification">
      <div className={`notification-icon ${getColor()}`}>
        {getIcon()}
      </div>
      <div className="notification-content">
        <h4 className="notification-title">{notification.title}</h4>
        <p className="notification-message">{notification.message}</p>
      </div>
      <button 
        className="notification-close"
        onClick={() => onClose(notification.id)}
      >
        ×
      </button>
    </div>
  );
};

export { Notification };
export default Notification;
