import React, { useState, useEffect, useRef } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationPanelProps {
  maxVisible?: number;
  _autoHideDelay?: number;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  maxVisible = 5,
  onNotificationClick,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: '下载完成',
        message: '文件 document.pdf 已成功下载到本地',
        timestamp: Date.now() - 1000 * 60 * 5,
        read: false,
      },
      {
        id: '2',
        type: 'success',
        title: '上传完成',
        message: '文件 image.jpg 已成功上传到服务器',
        timestamp: Date.now() - 1000 * 60 * 30,
        read: false,
      },
      {
        id: '3',
        type: 'warning',
        title: '下载失败',
        message: '文件 video.mp4 下载失败，网络连接中断',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        read: true,
      },
      {
        id: '4',
        type: 'info',
        title: '系统公告',
        message: '系统将于今晚23:00-24:00进行维护，届时服务可能暂时中断',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
        read: true,
      },
      {
        id: '5',
        type: 'error',
        title: '存储空间不足',
        message: '您的存储空间已使用90%，建议清理部分文件',
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        read: true,
      },
    ];
    setNotifications(mockNotifications);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: Notification['type']): string => {
    switch (type) {
      case 'success':
        return 'text-emerald-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const displayedNotifications = filteredNotifications.slice(0, maxVisible);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-xl"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center leading-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 w-[380px] max-h-[600px] bg-white rounded-xl shadow-lg z-50 overflow-hidden mt-2"
        >
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">通知中心</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors"
                >
                  全部已读
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
                >
                  清空
                </button>
              )}
            </div>
          </div>

          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                filter === 'all'
                  ? 'text-blue-500 border-blue-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              全部 {notifications.length}
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                filter === 'unread'
                  ? 'text-blue-500 border-blue-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              未读 {unreadCount}
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {displayedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-15 text-gray-400">
                <span className="text-4xl mb-4">📭</span>
                <p className="text-sm">
                  {filter === 'unread' ? '暂无未读通知' : '暂无通知'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative flex gap-3 px-5 py-4 border-b border-gray-50 cursor-pointer transition-colors ${
                    notification.read ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (onNotificationClick) {
                      onNotificationClick(notification);
                    }
                    handleMarkAsRead(notification.id);
                  }}
                >
                  <div className={`text-xl flex-shrink-0 ${!notification.read ? 'animate-pulse' : ''}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-semibold ${getNotificationColor(notification.type)}`}>
                        {notification.type === 'success' && '成功'}
                        {notification.type === 'error' && '错误'}
                        {notification.type === 'warning' && '警告'}
                        {notification.type === 'info' && '信息'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">
                      {notification.message}
                    </div>
                    {notification.action && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          notification.action?.onClick();
                        }}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors"
                      >
                        {notification.action.label}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                    className="absolute top-3 right-3 w-6 h-6 bg-red-50 text-red-500 rounded-full text-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    title="删除通知"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {filteredNotifications.length > maxVisible && (
            <div className="px-5 py-3 border-t border-gray-100">
              <button className="w-full py-2.5 bg-gray-50 text-blue-500 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                查看更多通知 ({filteredNotifications.length - maxVisible})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;