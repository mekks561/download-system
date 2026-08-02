import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DownloadItem, DownloadNotification, Priority } from '../types';
import { DownloadService } from '../services/DownloadService';
import { useDownloadStore } from '../store/useDownloadStore';

const PROGRESS_UPDATE_INTERVAL = 100;

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const useDownloadManager = () => {
  // 单一数据源：zustand store。History 页面也读取同一 store，确保跨页面数据一致。
  const downloads = useDownloadStore((s) => s.downloads);
  const updateDownload = useDownloadStore((s) => s.updateDownload);
  const removeDownloadFromStore = useDownloadStore((s) => s.removeDownload);
  const setDownloads = useDownloadStore((s) => s.setDownloads);

  const [notifications, setNotifications] = useState<DownloadNotification[]>([]);
  const downloadServiceRef = useRef(DownloadService.getInstance());
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map());
  const lastDownloadedBytesRef = useRef<Map<string, number>>(new Map());
  const lastProgressUpdateRef = useRef<Map<string, number>>(new Map());
  const notificationSentRef = useRef<Set<string>>(new Set());
  // 用 ref 持有最新 downloads 快照，供 unmount cleanup 使用（避免 cleanup 依赖 downloads 触发反复取消）
  const downloadsRef = useRef<DownloadItem[]>(downloads);
  downloadsRef.current = downloads;

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
    
    const savedProgress = downloadServiceRef.current.getSavedProgress(url);
    const resumePosition = savedProgress?.resumePosition || 0;
    const totalBytes = savedProgress?.totalBytes || 0;
    const progress = totalBytes > 0 ? (resumePosition / totalBytes) * 100 : 0;
    
    const newItem: DownloadItem = {
      id: downloadServiceRef.current.generateId(),
      url,
      filename: name,
      status: resumePosition > 0 ? 'paused' : 'pending',
      progress,
      downloadedBytes: resumePosition,
      totalBytes,
      speed: 0,
      resumePosition,
      createdAt: Date.now(),
      priority,
    };

    useDownloadStore.getState().addDownload(newItem);
    
    if (resumePosition > 0) {
      addNotification('info', '检测到断点', `可从 ${downloadServiceRef.current.formatFileSize(resumePosition)} 处继续下载`);
    }
    
    return newItem.id;
  }, [addNotification]);

  const addBulkDownloads = useCallback((urls: string[], filenames?: string[], priority: Priority = 'normal') => {
    const newItems: DownloadItem[] = urls.map((url, index) => {
      const name = (filenames && filenames[index]) || url.split('/').pop() || `download_${index + 1}`;
      
      const savedProgress = downloadServiceRef.current.getSavedProgress(url);
      const resumePosition = savedProgress?.resumePosition || 0;
      const totalBytes = savedProgress?.totalBytes || 0;
      const progress = totalBytes > 0 ? (resumePosition / totalBytes) * 100 : 0;
      
      return {
        id: downloadServiceRef.current.generateId(),
        url,
        filename: name,
        status: 'pending',
        progress,
        downloadedBytes: resumePosition,
        totalBytes,
        speed: 0,
        resumePosition,
        createdAt: Date.now(),
        priority,
      };
    });

    // 通过 getState 取最新数组后追加，避免闭包过期数据
    useDownloadStore.setState((state) => ({ downloads: [...state.downloads, ...newItems] }));
    addNotification('info', '批量添加成功', `已添加 ${newItems.length} 个下载任务`);
    return newItems.map(item => item.id);
  }, [addNotification]);

  const setPriority = useCallback((id: string, priority: Priority) => {
    updateDownload(id, { priority });
  }, [updateDownload]);

  const sortByPriority = useCallback(() => {
    const current = useDownloadStore.getState().downloads;
    const sorted = [...current].sort((a, b) => {
      if (a.status === 'downloading' && b.status !== 'downloading') return -1;
      if (b.status === 'downloading' && a.status !== 'downloading') return 1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });
    setDownloads(sorted);
  }, [setDownloads]);

  const createProgressHandler = useCallback((id: string, initialBytes: number) => {
    return (progress: Partial<DownloadItem>) => {
      const now = Date.now();
      const lastUpdate = lastProgressUpdateRef.current.get(id) || 0;

      if (now - lastUpdate < PROGRESS_UPDATE_INTERVAL) {
        return;
      }

      lastProgressUpdateRef.current.set(id, now);

      const prevTime = lastUpdateTimeRef.current.get(id) || now;
      const prevBytes = lastDownloadedBytesRef.current.get(id) || initialBytes;
      
      const timeDiff = (now - prevTime) / 1000;
      const bytesDiff = (progress.downloadedBytes || 0) - prevBytes;
      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

      lastUpdateTimeRef.current.set(id, now);
      lastDownloadedBytesRef.current.set(id, progress.downloadedBytes || 0);

      updateDownload(id, { ...progress, speed });
    };
  }, [updateDownload]);

  const initiateDownload = useCallback((id: string) => {
    const item = useDownloadStore.getState().downloads.find(d => d.id === id);
    if (!item) return;

    lastDownloadedBytesRef.current.set(id, item.downloadedBytes);
    lastUpdateTimeRef.current.set(id, Date.now());

    const handleProgress = createProgressHandler(id, item.downloadedBytes);

    updateDownload(id, { status: 'downloading' });

    setTimeout(() => {
      void downloadServiceRef.current.downloadFile({ ...item, status: 'downloading' }, handleProgress);
    }, 0);
  }, [createProgressHandler, updateDownload]);

  const startDownload = useCallback((id: string) => {
    initiateDownload(id);
  }, [initiateDownload]);

  const pauseDownload = useCallback((id: string) => {
    downloadServiceRef.current.pauseDownload(id);
    updateDownload(id, { status: 'paused', speed: 0 });
    addNotification('warning', '下载暂停', '下载已暂停，可以随时继续');
  }, [updateDownload, addNotification]);

  const resumeDownload = useCallback((id: string) => {
    initiateDownload(id);
  }, [initiateDownload]);

  const cancelDownload = useCallback((id: string) => {
    downloadServiceRef.current.cancelDownload(id);
    updateDownload(id, { status: 'cancelled', speed: 0 });
    addNotification('warning', '下载已取消', '下载已被取消');
  }, [updateDownload, addNotification]);

  const removeDownload = useCallback((id: string) => {
    removeDownloadFromStore(id);
    lastUpdateTimeRef.current.delete(id);
    lastDownloadedBytesRef.current.delete(id);
    lastProgressUpdateRef.current.delete(id);
  }, [removeDownloadFromStore]);

  const clearCompleted = useCallback(() => {
    const current = useDownloadStore.getState().downloads;
    current.forEach(item => {
      if (item.status === 'completed' || item.status === 'cancelled') {
        lastUpdateTimeRef.current.delete(item.id);
        lastDownloadedBytesRef.current.delete(item.id);
        lastProgressUpdateRef.current.delete(item.id);
      }
    });
    setDownloads(current.filter(item => item.status !== 'completed' && item.status !== 'cancelled'));
  }, [setDownloads]);

  // 仅在组件卸载时执行清理：取消所有进行中的下载并重置内部 ref。
  // 使用 ref 快照 + 空依赖数组，避免每次进度更新都触发 cleanup 从而反复取消下载。
  useEffect(() => {
    const downloadService = downloadServiceRef.current;
    const lastUpdateTime = lastUpdateTimeRef.current;
    const lastDownloadedBytes = lastDownloadedBytesRef.current;
    const lastProgressUpdate = lastProgressUpdateRef.current;
    const notificationSent = notificationSentRef.current;

    return () => {
      downloadsRef.current.forEach(item => {
        if (item.status === 'downloading') {
          downloadService.cancelDownload(item.id);
        }
      });
      lastUpdateTime.clear();
      lastDownloadedBytes.clear();
      lastProgressUpdate.clear();
      notificationSent.clear();
    };
  }, []);

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
      } else if (item.status !== 'completed' && item.status !== 'error') {
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
