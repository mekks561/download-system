import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DownloadItem, DownloadStatus, DownloadNotification, Priority } from '../types';
import { DownloadService } from '../services/DownloadService';

const PROGRESS_UPDATE_INTERVAL = 100;

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const useDownloadManager = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [notifications, setNotifications] = useState<DownloadNotification[]>([]);
  const downloadService = useRef(DownloadService.getInstance());
  const lastUpdateTime = useRef<Map<string, number>>(new Map());
  const lastDownloadedBytes = useRef<Map<string, number>>(new Map());
  const lastProgressUpdate = useRef<Map<string, number>>(new Map());

  const addNotification = useCallback((type: DownloadNotification['type'], title: string, message: string) => {
    const notification: DownloadNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
    };
    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  const addDownload = useCallback((url: string, filename?: string, priority: Priority = 'normal') => {
    const name = filename || url.split('/').pop() || 'download';
    const newItem: DownloadItem = {
      id: downloadService.current.generateId(),
      url,
      filename: name,
      status: 'pending',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      resumePosition: 0,
      createdAt: Date.now(),
      priority,
    };

    setDownloads(prev => [...prev, newItem]);
    return newItem.id;
  }, []);

  const addBulkDownloads = useCallback((urls: string[], filenames?: string[], priority: Priority = 'normal') => {
    const newItems: DownloadItem[] = urls.map((url, index) => {
      const name = (filenames && filenames[index]) || url.split('/').pop() || `download_${index + 1}`;
      return {
        id: downloadService.current.generateId(),
        url,
        filename: name,
        status: 'pending',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        resumePosition: 0,
        createdAt: Date.now(),
        priority,
      };
    });

    setDownloads(prev => [...prev, ...newItems]);
    addNotification('info', '批量添加成功', `已添加 ${newItems.length} 个下载任务`);
    return newItems.map(item => item.id);
  }, [addNotification]);

  const setPriority = useCallback((id: string, priority: Priority) => {
    setDownloads(prev => prev.map(item => 
      item.id === id ? { ...item, priority } : item
    ));
  }, []);

  const sortByPriority = useCallback(() => {
    setDownloads(prev => [...prev].sort((a, b) => {
      if (a.status === 'downloading' && b.status !== 'downloading') return -1;
      if (b.status === 'downloading' && a.status !== 'downloading') return 1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }));
  }, []);

  const createProgressHandler = useCallback((id: string, initialBytes: number) => {
    return (progress: Partial<DownloadItem>) => {
      const now = Date.now();
      const lastUpdate = lastProgressUpdate.current.get(id) || 0;

      if (now - lastUpdate < PROGRESS_UPDATE_INTERVAL) {
        return;
      }

      lastProgressUpdate.current.set(id, now);

      const prevTime = lastUpdateTime.current.get(id) || now;
      const prevBytes = lastDownloadedBytes.current.get(id) || initialBytes;
      
      const timeDiff = (now - prevTime) / 1000;
      const bytesDiff = (progress.downloadedBytes || 0) - prevBytes;
      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

      lastUpdateTime.current.set(id, now);
      lastDownloadedBytes.current.set(id, progress.downloadedBytes || 0);

      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, ...progress, speed } : d
      ));
    };
  }, []);

  const initiateDownload = useCallback((id: string) => {
    setDownloads(prev => {
      const item = prev.find(d => d.id === id);
      if (!item) return prev;

      lastDownloadedBytes.current.set(id, item.downloadedBytes);
      lastUpdateTime.current.set(id, Date.now());

      const handleProgress = createProgressHandler(id, item.downloadedBytes);

      setTimeout(() => {
        downloadService.current.downloadFile({ ...item, status: 'downloading' }, handleProgress);
      }, 0);

      return prev.map(d => 
        d.id === id ? { ...d, status: 'downloading' as DownloadStatus } : d
      );
    });
  }, [createProgressHandler]);

  const startDownload = initiateDownload;

  const pauseDownload = useCallback((id: string) => {
    downloadService.current.pauseDownload(id);
    setDownloads(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'paused' as DownloadStatus, speed: 0 } : item
    ));
    addNotification('warning', '下载暂停', '下载已暂停，可以随时继续');
  }, [addNotification]);

  const resumeDownload = initiateDownload;

  const cancelDownload = useCallback((id: string) => {
    downloadService.current.cancelDownload(id);
    setDownloads(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'cancelled' as DownloadStatus, speed: 0 } : item
    ));
    addNotification('warning', '下载已取消', '下载已被取消');
  }, [addNotification]);

  const removeDownload = useCallback((id: string) => {
    setDownloads(prev => prev.filter(item => item.id !== id));
    lastUpdateTime.current.delete(id);
    lastDownloadedBytes.current.delete(id);
    lastProgressUpdate.current.delete(id);
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads(prev => {
      const remaining = prev.filter(item => 
        item.status !== 'completed' && item.status !== 'cancelled'
      );
      prev.forEach(item => {
        if (item.status === 'completed' || item.status === 'cancelled') {
          lastUpdateTime.current.delete(item.id);
          lastDownloadedBytes.current.delete(item.id);
          lastProgressUpdate.current.delete(item.id);
        }
      });
      return remaining;
    });
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    return () => {
      const downloadServiceRef = downloadService.current;
      const lastUpdateTimeRef = lastUpdateTime.current;
      const lastDownloadedBytesRef = lastDownloadedBytes.current;
      const lastProgressUpdateRef = lastProgressUpdate.current;
      const notificationSentRefCopy = notificationSentRef.current;

      downloads.forEach(item => {
        if (item.status === 'downloading') {
          downloadServiceRef.cancelDownload(item.id);
        }
      });
      lastUpdateTimeRef.clear();
      lastDownloadedBytesRef.clear();
      lastProgressUpdateRef.clear();
      notificationSentRefCopy.clear();
    };
  }, [downloads]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const notificationSentRef = useRef<Set<string>>(new Set());

  const stats = useMemo(() => ({
    totalDownloads: downloads.length,
    completedDownloads: downloads.filter(d => d.status === 'completed').length,
    failedDownloads: downloads.filter(d => d.status === 'error').length,
    totalSize: downloads.reduce((acc, d) => acc + d.totalBytes, 0),
    downloadedSize: downloads.reduce((acc, d) => acc + d.downloadedBytes, 0),
  }), [downloads]);

  useEffect(() => {
    downloads.forEach(item => {
      if (item.status === 'completed' && !notificationSentRef.current.has(item.id)) {
        notificationSentRef.current.add(item.id);
        addNotification('success', '下载完成', `文件 "${item.filename}" 已成功下载`);
      } else if (item.status === 'error' && !notificationSentRef.current.has(item.id)) {
        notificationSentRef.current.add(item.id);
        addNotification('error', '下载失败', item.error || '下载过程中发生错误');
      }
    });

    downloads.forEach(item => {
      if (item.status !== 'completed' && item.status !== 'error') {
        notificationSentRef.current.delete(item.id);
      }
    });
  }, [downloads, addNotification]);

  return {
    downloads,
    notifications,
    stats,
    addDownload,
    addBulkDownloads,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    clearCompleted,
    setPriority,
    sortByPriority,
  };
};