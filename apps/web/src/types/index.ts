export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: DownloadStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  peers?: number;
  error?: string;
  resumePosition: number;
  createdAt: number;
  completedAt?: number;
  priority: Priority;
  category_id?: number;
  metadata?: {
    aiCategory?: string;
    aiConfidence?: number;
    aiReason?: string;
    aiClassifiedAt?: string;
    workerId?: string;
    [key: string]: any;
  };
}

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled' | 'retrying' | 'healing';

export interface UploadItem {
  id: string;
  file: File;
  filename: string;
  status: UploadStatus;
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  speed: number;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';

export interface DownloadStats {
  totalDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  totalSize: number;
  downloadedSize: number;
}

export interface DownloadNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

export * from './WorkflowTypes';
