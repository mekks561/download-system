import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { DownloadItem } from '../types';
import { DownloadApiService } from '../services/DownloadApiService';

interface DownloadState {
  downloads: DownloadItem[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalDownloads: number;
    completedDownloads: number;
    failedDownloads: number;
    totalSize: number;
    downloadedSize: number;
  };

  addDownload: (url: string, filename?: string) => string;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => Promise<void>;
  startDownload: (id: string) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  fetchDownloads: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const useDownloadApiStore = create<DownloadState>()(
  devtools(
    persist(
      (set, get) => ({
        downloads: [],
        isLoading: false,
        error: null,
        stats: {
          totalDownloads: 0,
          completedDownloads: 0,
          failedDownloads: 0,
          totalSize: 0,
          downloadedSize: 0,
        },

        addDownload: (url: string, filename?: string) => {
          const id = Date.now().toString();
          const newDownload: DownloadItem = {
            id,
            url,
            filename: filename || url.split('/').pop() || 'unknown',
            status: 'pending',
            progress: 0,
            downloadedBytes: 0,
            totalBytes: 0,
            speed: 0,
            resumePosition: 0,
            createdAt: Date.now(),
            priority: 'normal',
          };
          set((state) => ({ downloads: [...state.downloads, newDownload] }));
          return id;
        },

        updateDownload: (id: string, updates: Partial<DownloadItem>) => {
          set((state) => ({
            downloads: state.downloads.map((d) =>
              d.id === id ? { ...d, ...updates } : d
            ),
          }));
        },

        removeDownload: (id: string) => {
          set((state) => ({
            downloads: state.downloads.filter((d) => d.id !== id),
          }));
        },

        clearCompleted: async () => {
          const response = await DownloadApiService.clearCompleted();
          if (response.success) {
            set((state) => ({
              downloads: state.downloads.filter((d) => d.status !== 'completed'),
            }));
            void get().fetchStats();
          }
        },

        startDownload: async (id: string) => {
          set((state) => ({
            downloads: state.downloads.map((d) =>
              d.id === id ? { ...d, status: 'downloading' as const } : d
            ),
          }));
          const response = await DownloadApiService.startDownload(id);
          if (!response.success) {
            set((state) => ({
              downloads: state.downloads.map((d) =>
                d.id === id ? { ...d, status: 'error' as const } : d
              ),
              error: response.message,
            }));
          }
        },

        pauseDownload: async (id: string) => {
          set((state) => ({
            downloads: state.downloads.map((d) =>
              d.id === id ? { ...d, status: 'paused' as const } : d
            ),
          }));
          await DownloadApiService.pauseDownload(id);
        },

        resumeDownload: async (id: string) => {
          set((state) => ({
            downloads: state.downloads.map((d) =>
              d.id === id ? { ...d, status: 'downloading' as const } : d
            ),
          }));
          await DownloadApiService.resumeDownload(id);
        },

        cancelDownload: async (id: string) => {
          set((state) => ({
            downloads: state.downloads.map((d) =>
              d.id === id ? { ...d, status: 'cancelled' as const } : d
            ),
          }));
          await DownloadApiService.cancelDownload(id);
        },

        fetchDownloads: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await DownloadApiService.getAllDownloads();
            if (response.success && response.data) {
              set({ downloads: response.data });
            }
          } catch {
            set({ error: '获取下载列表失败' });
          }
          set({ isLoading: false });
        },

        fetchStats: async () => {
          try {
            const response = await DownloadApiService.getDownloadStats();
            if (response.success && response.data) {
              set({ stats: response.data });
            }
          } catch (error) {
            console.error('Failed to fetch stats:', error);
          }
        },
      }),
      { name: 'download-store' }
    ),
    { name: 'DownloadApiStore' }
  )
);