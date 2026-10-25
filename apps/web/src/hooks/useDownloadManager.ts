import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DownloadItem, DownloadNotification, Priority } from '../types';
import { DownloadApiService } from '../services/DownloadApiService';
import { useDownloadStore } from '../store/useDownloadStore';
import SocketService from '../services/socketService';

/**
 * 下载管理 Hook（服务端引擎版）。
 *
 * 历史包袱：v3.1.0 里这个 Hook 走的是一条纯浏览器端下载链路
 * （DownloadService + Web Worker，用 fetch 把文件拉到内存 Blob），
 * 现在统一改为驱动服务端下载引擎：
 *   - 增删启停 → 调 `/api/downloads*`
 *   - 进度同步 → Socket.io 实时推送 + 降级轮询
 */
const POLL_INTERVAL_MS = 3000; // 有了 Socket 推送，轮询间隔可以拉长，仅作兜底

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** 后端返回的行结构（serialize.ts 已把 BigInt/Decimal 转 number，时间转 ISO 字符串） */
interface ApiDownloadRow {
  id: number;
  url: string;
  filename: string;
  status: DownloadItem['status'];
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  resumePosition: number;
  createdAt: string;
  completedAt: string | null;
}

function toDownloadItem(row: ApiDownloadRow): DownloadItem {
  return {
    id: String(row.id),
    url: row.url,
    filename: row.filename,
    status: row.status,
    progress: Number(row.progress ?? 0),
    downloadedBytes: Number(row.downloadedBytes ?? 0),
    totalBytes: Number(row.totalBytes ?? 0),
    speed: Number(row.speed ?? 0),
    resumePosition: Number(row.resumePosition ?? 0),
    createdAt: row.createdAt ? Date.parse(row.createdAt) : Date.now(),
    completedAt: row.completedAt ? Date.parse(row.completedAt) : undefined,
    priority: 'normal',
  };
}

export const useDownloadManager = () => {
  // 单一数据源：zustand store（Downloads 页与 History 页共读同一份）
  const downloads = useDownloadStore((s) => s.downloads);
  const updateDownload = useDownloadStore((s) => s.updateDownload);
  const removeDownloadFromStore = useDownloadStore((s) => s.removeDownload);
  const setDownloads = useDownloadStore((s) => s.setDownloads);

  const [notifications, setNotifications] = useState<DownloadNotification[]>([]);
  const notificationSentRef = useRef<Set<string>>(new Set());

  const addNotification = useCallback(
    (type: DownloadNotification['type'], title: string, message: string) => {
      const notification: DownloadNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        type,
        title,
        message,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [...prev, notification]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 5000);
    },
    [],
  );

  /** 从服务端拉取最新列表覆盖本地 store —— 进度与状态变化全靠它同步 */
  const refresh = useCallback(async () => {
    const resp = await DownloadApiService.getAllDownloads();
    if (resp.success && Array.isArray(resp.data)) {
      setDownloads((resp.data as unknown as ApiDownloadRow[]).map(toDownloadItem));
    }
  }, [setDownloads]);

  // 首次挂载同步一次
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Socket.io 实时进度同步
  useEffect(() => {
    const socketService = SocketService.getInstance();
    
    const unsubscribeProgress = socketService.onDownloadProgress((data) => {
      updateDownload(String(data.downloadId), {
        progress: data.progress,
        status: data.status as DownloadItem['status'],
        speed: (data as any).speed || 0,
        peers: (data as any).peers,
      });
    });

    const unsubscribeComplete = socketService.onDownloadComplete((data) => {
      updateDownload(String(data.downloadId), {
        status: 'completed',
        progress: 100,
        speed: 0,
      });
      void refresh(); // 完成后拉一次全量数据同步文件名等信息
    });

    const unsubscribeFailed = socketService.onDownloadFailed((data) => {
      updateDownload(String(data.downloadId), {
        status: 'error',
        speed: 0,
      });
      void refresh();
    });

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeFailed();
    };
  }, [updateDownload, refresh]);

  // 仅当存在进行中的任务时才轮询 —— 空闲时不发任何请求，
  // 既省 API 限流配额，也让页面能真正 idle（避免对自动化/省电造成无谓干扰）。
  const hasActiveTask = downloads.some(
    (d) => d.status === 'downloading' || d.status === 'pending',
  );
  useEffect(() => {
    if (!hasActiveTask) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hasActiveTask, refresh]);

  /** 新建下载任务（创建后为 pending，需再调 startDownload 才真正开始拉取） */
  const addDownload = useCallback(
    async (url: string, filename?: string, priority: Priority = 'normal', metadata?: Record<string, any>): Promise<string | null> => {
      const resp = await DownloadApiService.createDownload({ url, filename, metadata });
      const created = resp.data as unknown as ApiDownloadRow | undefined;
      if (!resp.success || !created) {
        addNotification('error', '添加失败', resp.message || '无法创建下载任务');
        return null;
      }
      const item = { ...toDownloadItem(created), priority };
      useDownloadStore.getState().addDownload(item);
      return item.id;
    },
    [addNotification],
  );

  const addBulkDownloads = useCallback(
    async (urls: string[], filenames?: string[], priority: Priority = 'normal'): Promise<string[]> => {
      const ids: string[] = [];
      for (let i = 0; i < urls.length; i += 1) {
        // 顺序创建，避免同一瞬间打爆限流
        const id = await addDownload(urls[i], filenames?.[i], priority);
        if (id) ids.push(id);
      }
      if (ids.length > 0) {
        addNotification('info', '批量添加成功', `已添加 ${ids.length} 个下载任务`);
      }
      return ids;
    },
    [addDownload, addNotification],
  );

  const setPriority = useCallback(
    (id: string, priority: Priority) => {
      updateDownload(id, { priority });
    },
    [updateDownload],
  );

  const sortByPriority = useCallback(() => {
    const current = useDownloadStore.getState().downloads;
    const sorted = [...current].sort((a, b) => {
      if (a.status === 'downloading' && b.status !== 'downloading') return -1;
      if (b.status === 'downloading' && a.status !== 'downloading') return 1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });
    setDownloads(sorted);
  }, [setDownloads]);

  const startDownload = useCallback(
    async (id: string) => {
      updateDownload(id, { status: 'downloading' });
      const resp = await DownloadApiService.startDownload(id);
      if (!resp.success) {
        updateDownload(id, { status: 'error' });
        addNotification('error', '启动失败', resp.message || '无法启动下载任务');
      }
      void refresh();
    },
    [updateDownload, addNotification, refresh],
  );

  const pauseDownload = useCallback(
    async (id: string) => {
      updateDownload(id, { status: 'paused', speed: 0 });
      await DownloadApiService.pauseDownload(id);
      addNotification('warning', '下载暂停', '下载已暂停，可以随时继续');
      void refresh();
    },
    [updateDownload, addNotification, refresh],
  );

  const resumeDownload = useCallback(
    async (id: string) => {
      updateDownload(id, { status: 'downloading' });
      await DownloadApiService.resumeDownload(id);
      void refresh();
    },
    [updateDownload, refresh],
  );

  const cancelDownload = useCallback(
    async (id: string) => {
      updateDownload(id, { status: 'cancelled', speed: 0 });
      await DownloadApiService.cancelDownload(id);
      addNotification('warning', '下载已取消', '下载已被取消');
      void refresh();
    },
    [updateDownload, addNotification, refresh],
  );

  const removeDownload = useCallback(
    async (id: string) => {
      removeDownloadFromStore(id);
      await DownloadApiService.deleteDownload(id);
      void refresh();
    },
    [removeDownloadFromStore, refresh],
  );

  const clearCompleted = useCallback(async () => {
    const resp = await DownloadApiService.clearCompleted();
    if (resp.success) {
      useDownloadStore.getState().clearCompleted();
    }
    void refresh();
  }, [refresh]);

  const stats = useMemo(
    () => ({
      totalDownloads: downloads.length,
      completedDownloads: downloads.filter((d) => d.status === 'completed').length,
      failedDownloads: downloads.filter((d) => d.status === 'error').length,
      totalSize: downloads.reduce((acc, d) => acc + d.totalBytes, 0),
      downloadedSize: downloads.reduce((acc, d) => acc + d.downloadedBytes, 0),
    }),
    [downloads],
  );

  // 完成 / 失败时弹一次通知
  useEffect(() => {
    downloads.forEach((item) => {
      if (item.status === 'completed' && !notificationSentRef.current.has(item.id)) {
        notificationSentRef.current.add(item.id);
        addNotification('success', '下载完成', `文件 "${item.filename}" 已成功下载`);
        
        // 桌面端原生通知
        if (window.dm?.env.isDesktop) {
          window.dm.notification.show('下载完成', `文件 "${item.filename}" 已保存至本地`);
        }
      } else if (item.status === 'error' && !notificationSentRef.current.has(item.id)) {
        notificationSentRef.current.add(item.id);
        addNotification('error', '下载失败', item.error || '下载过程中发生错误');
        
        // 桌面端原生通知
        if (window.dm?.env.isDesktop) {
          window.dm.notification.show('下载失败', `任务 "${item.filename}" 出错`);
        }
      } else if (item.status !== 'completed' && item.status !== 'error') {
        notificationSentRef.current.delete(item.id);
      }
    });
  }, [downloads, addNotification]);

  const parseMetadata = useCallback(async (url?: string, file?: string) => {
    return DownloadApiService.parseMetadata(url, file);
  }, []);

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
    parseMetadata,
  };
};
