import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadItem, DownloadNotification } from '../types';
import { UploadService } from '../services/UploadService';
import { AuthService } from '../services/AuthService';

export const useUploadManager = () => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [notifications, setNotifications] = useState<DownloadNotification[]>([]);
  const uploadService = useRef(UploadService.getInstance());
  const authService = AuthService.getInstance();
  const lastUpdateTime = useRef<Map<string, number>>(new Map());
  const lastUploadedBytes = useRef<Map<string, number>>(new Map());

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

  const addUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newItems: UploadItem[] = fileArray.map(file => ({
      id: uploadService.current.generateId(),
      file,
      filename: file.name,
      status: 'pending',
      progress: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      speed: 0,
      createdAt: Date.now(),
    }));

    setUploads(prev => [...prev, ...newItems]);
    return newItems.map(item => item.id);
  }, []);

  const startUpload = useCallback(async (id: string) => {
    setUploads(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'uploading' } : item
    ));

    const item = uploads.find(u => u.id === id);
    if (!item) return;

    const handleProgress = (progress: Partial<UploadItem>) => {
      const now = Date.now();
      const prevTime = lastUpdateTime.current.get(id) || now;
      const prevBytes = lastUploadedBytes.current.get(id) || 0;

      const timeDiff = (now - prevTime) / 1000;
      const bytesDiff = (progress.uploadedBytes || 0) - prevBytes;
      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

      lastUpdateTime.current.set(id, now);
      lastUploadedBytes.current.set(id, progress.uploadedBytes || 0);

      setUploads(prev => prev.map(u =>
        u.id === id ? { ...u, ...progress, speed } : u
      ));
    };

    await uploadService.current.uploadFile(item, handleProgress);

    const updatedItem = uploads.find(u => u.id === id);
    if (updatedItem?.status === 'completed') {
      addNotification('success', '上传完成', `文件 "${updatedItem.filename}" 已成功上传`);
    } else if (updatedItem?.status === 'error') {
      addNotification('error', '上传失败', updatedItem.error || '上传过程中发生错误');
    }
  }, [uploads, addNotification, authService]);

  const pauseUpload = useCallback((id: string) => {
    uploadService.current.pauseUpload(id);
    setUploads(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'paused', speed: 0 } : item
    ));
    addNotification('warning', '上传暂停', '上传已暂停，可以随时继续');
  }, [addNotification]);

  const resumeUpload = useCallback(async (id: string) => {
    const item = uploads.find(u => u.id === id);
    if (!item) return;

    setUploads(prev => prev.map(u =>
      u.id === id ? { ...u, status: 'uploading' } : u
    ));

    const handleProgress = (progress: Partial<UploadItem>) => {
      const now = Date.now();
      const prevTime = lastUpdateTime.current.get(id) || now;
      const prevBytes = lastUploadedBytes.current.get(id) || item.uploadedBytes;
      
      const timeDiff = (now - prevTime) / 1000;
      const bytesDiff = (progress.uploadedBytes || 0) - prevBytes;
      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

      lastUpdateTime.current.set(id, now);
      lastUploadedBytes.current.set(id, progress.uploadedBytes || 0);

      setUploads(prev => prev.map(u => 
        u.id === id ? { ...u, ...progress, speed } : u
      ));
    };

    await uploadService.current.uploadFile(item, handleProgress);
  }, [uploads, authService]);

  const cancelUpload = useCallback((id: string) => {
    uploadService.current.cancelUpload(id);
    setUploads(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'cancelled', speed: 0 } : item
    ));
    addNotification('warning', '上传已取消', '上传已被取消');
  }, [addNotification]);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(item => 
      item.status !== 'completed' && item.status !== 'cancelled'
    ));
  }, []);

  const startAllUploads = useCallback(async () => {
    const pendingUploads = uploads.filter(u => u.status === 'pending');
    for (const item of pendingUploads) {
      await startUpload(item.id);
    }
  }, [uploads, startUpload]);

  useEffect(() => {
    return () => {
      const uploadServiceRef = uploadService.current;
      uploads.forEach(item => {
        if (item.status === 'uploading') {
          uploadServiceRef.cancelUpload(item.id);
        }
      });
    };
  }, [uploads]);

  const stats = {
    totalDownloads: uploads.length,
    completedDownloads: uploads.filter(u => u.status === 'completed').length,
    failedDownloads: uploads.filter(u => u.status === 'error').length,
    totalSize: uploads.reduce((acc, u) => acc + u.totalBytes, 0),
    downloadedSize: uploads.reduce((acc, u) => acc + u.uploadedBytes, 0),
  };

  return {
    uploads,
    notifications,
    stats,
    addUpload,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    removeUpload,
    clearCompleted,
    startAllUploads,
  };
};
