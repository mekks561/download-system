import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DownloadItem, DownloadStatus } from '../types';

interface DownloadState {
  downloads: DownloadItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setDownloads: (downloads: DownloadItem[]) => void;
  addDownload: (download: DownloadItem) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  
  // Filters
  statusFilter: DownloadStatus | 'all';
  setStatusFilter: (status: DownloadStatus | 'all') => void;
  
  // Loading & Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDownloadStore = create<DownloadState>()(
  devtools(
    (set) => ({
      downloads: [],
      isLoading: false,
      error: null,
      
      setDownloads: (downloads) => set({ downloads }),
      
      addDownload: (download) =>
        set((state) => ({ downloads: [...state.downloads, download] })),
        
      updateDownload: (id, updates) =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),
        
      removeDownload: (id) =>
        set((state) => ({
          downloads: state.downloads.filter((d) => d.id !== id),
        })),
        
      clearCompleted: () =>
        set((state) => ({
          downloads: state.downloads.filter((d) => d.status !== 'completed'),
        })),
        
      statusFilter: 'all',
      setStatusFilter: (status) => set({ statusFilter: status }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'DownloadStore' }
  )
);