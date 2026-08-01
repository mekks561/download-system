import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { UploadItem, UploadStatus } from '../types';

interface UploadState {
  uploads: UploadItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUploads: (uploads: UploadItem[]) => void;
  addUpload: (upload: UploadItem) => void;
  updateUpload: (id: string, updates: Partial<UploadItem>) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
  
  // Filters
  statusFilter: UploadStatus | 'all';
  setStatusFilter: (status: UploadStatus | 'all') => void;
  
  // Loading & Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUploadStore = create<UploadState>()(
  devtools(
    (set) => ({
      uploads: [],
      isLoading: false,
      error: null,
      
      setUploads: (uploads) => set({ uploads }),
      
      addUpload: (upload) =>
        set((state) => ({ uploads: [...state.uploads, upload] })),
        
      updateUpload: (id, updates) =>
        set((state) => ({
          uploads: state.uploads.map((u) =>
            u.id === id ? { ...u, ...updates } : u
          ),
        })),
        
      removeUpload: (id) =>
        set((state) => ({
          uploads: state.uploads.filter((u) => u.id !== id),
        })),
        
      clearCompleted: () =>
        set((state) => ({
          uploads: state.uploads.filter((u) => u.status !== 'completed'),
        })),
        
      statusFilter: 'all',
      setStatusFilter: (status) => set({ statusFilter: status }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'UploadStore' }
  )
);