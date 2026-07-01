import axios, { AxiosRequestConfig } from 'axios';
import { UploadItem, UploadStatus } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

export class UploadService {
  private static instance: UploadService;
  private abortControllers: Map<string, AbortController> = new Map();

  private constructor() {}

  public static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  public async uploadFile(
    item: UploadItem,
    onProgress: (progress: Partial<UploadItem>) => void,
    token: string | null
  ): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(item.id, controller);

    const formData = new FormData();
    formData.append('file', item.file);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config: AxiosRequestConfig = {
        url: `${API_BASE_URL}/upload`,
        method: 'POST',
        data: formData,
        signal: controller.signal,
        headers,
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || item.totalBytes;
          const uploaded = progressEvent.loaded || 0;
          const progress = total > 0 ? (uploaded / total) * 100 : 0;
          
          onProgress({
            ...item,
            status: 'uploading',
            uploadedBytes: uploaded,
            totalBytes: total,
            progress: Math.min(progress, 100),
          });
        },
      };

      await axios(config);

      onProgress({
        ...item,
        status: 'completed' as UploadStatus,
        progress: 100,
        uploadedBytes: item.totalBytes,
        completedAt: Date.now(),
      });

    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        onProgress({ ...item, status: 'cancelled' as UploadStatus });
      } else {
        onProgress({ 
          ...item, 
          status: 'error' as UploadStatus, 
          error: error.message || '上传失败' 
        });
      }
    } finally {
      this.abortControllers.delete(item.id);
    }
  }

  public pauseUpload(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
    }
  }

  public cancelUpload(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
    }
  }

  public isUploading(id: string): boolean {
    return this.abortControllers.has(id);
  }

  public generateId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s';
  }

  public formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
