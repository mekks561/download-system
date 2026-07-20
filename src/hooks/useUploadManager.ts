import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadItem, DownloadNotification } from '../types';
import { UploadService } from '../services/UploadService';

export const useUploadManager = () => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [notifications, setNotifications] = useState<DownloadNotification[]>([]);
  const uploadServiceRef = useRef(UploadService.getInstance());
  const lastUpdateTimeRef = useRef<Map<string, number>>(new Map());
  const lastUploadedBytesRef = useRef<Map<string, number>>(new Map());

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
      id: uploadServiceRef.current.generateId(),
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
    let item: UploadItem | undefined;
    
    setUploads(prev => {
      item = prev.find(u => u.id === id);
      return prev.map(item =>
        item.id === id ? { ...item, status: 'uploading' } : item
      );
    });

    if (!item) return;

    const handleProgress = (progress: Partial<UploadItem>) => {
      const now = Date.now();
      const prevTime = lastUpdateTimeRef.current.get(id) || now;
      const prevBytes = lastUploadedBytesRef.current.get(id) || 0;

      const timeDiff = (now - prevTime) / 1000;
      const bytesDiff = (progress.uploadedBytes || 0) - prevBytes;
      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

      lastUpdateTimeRef.current.set(id, now);
      lastUploadedBytesRef.current.set(id, progress.uploadedBytes || 0);

      setUploads(prev => prev.map(u =>
        u.id === id ? { ...u, ...progress, speed } : u
      ));
    };

    await uploadServiceRef.current.uploadFile(item, handleProgress);

    setUploads(prev => {
      const updatedItem = prev.find(u => u.id === id);
      if (updatedItem?.status === 'completed') {
        addNotification('success', '上传完成', `文件 "${updatedItem.filename}" 已成功上传`);
      } else if (updatedItem?.status === 'error') {
        addNotification('error', '上传失败', updatedItem.error || '上传过程中发生错误');
      }
      return prev;
    });
  }, [addNotification]);

  const pauseUpload = useCallback((id: string) => {
    uploadServiceRef.current.pauseUpload(id);
    setUploads(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'paused', speed: 0 } : item
    ));
    addNotification('warning', '上传暂停', '上传已暂停，可以随时继续');
  }, [addNotification]);

  const resumeUpload = useCallback(async (id: string) => {
    let item: UploadItem | undefined;

    setUploads(prev => {
      item = prev.find(u => u.id === id);
      return prev.map(u =>
        u.id === id ? { ...u, status: 'uploading' } : u
      );
    });

    if (!item) return;

    const handleProgress = (progress: Partial<UploadItem>) => {
      const now = Date.now();
      const prevTime = lastUpdateTimeRef.current.get(id) || now;
      const prevBytes = lastUploadedBytesRef.current.get(id) || (item?.uploadedBytes ?? 0);
      
      const timeDiff = (now - prevTime) / 1000;
      const bytesDiff = (progress.uploadedBytes || 0) - prevBytes;
      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

      lastUpdateTimeRef.current.set(id, now);
      lastUploadedBytesRef.current.set(id, progress.uploadedBytes || 0);

      setUploads(prev => prev.map(u => 
        u.id === id ? { ...u, ...progress, speed } : u
      ));
    };

    await uploadServiceRef.current.uploadFile(item, handleProgress);
  }, []);

  const cancelUpload = useCallback((id: string) => {
    uploadServiceRef.current.cancelUpload(id);
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

  const startAllUploads = useCallback(() => {
    setUploads(prev => {
      const pendingUploads = prev.filter(u => u.status === 'pending');
      pendingUploads.forEach(item => {
        void startUpload(item.id);
      });
      return prev;
    });
  }, [startUpload]);

  useEffect(() => {
    const uploadService = uploadServiceRef.current;

    return () => {
      uploads.forEach(item => {
        if (item.status === 'uploading') {
          uploadService.cancelUpload(item.id);
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
