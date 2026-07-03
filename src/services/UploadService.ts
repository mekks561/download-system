import { UploadItem } from '../types';

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
    onProgress: (progress: Partial<UploadItem>) => void
  ): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(item.id, controller);

    const formData = new FormData();
    formData.append('file', item.file);

    try {
      const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
      
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
      
      if (reader && contentLength > 0) {
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          loaded += value?.length || 0;
          const progress = Math.min((loaded / contentLength) * 100, 100);
          onProgress({
            ...item,
            status: 'uploading',
            uploadedBytes: loaded,
            totalBytes: contentLength,
            progress,
          });
        }
      }

      onProgress({
        ...item,
        status: 'completed',
        progress: 100,
        uploadedBytes: item.totalBytes,
        completedAt: Date.now(),
      });

    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        onProgress({ ...item, status: 'cancelled' });
      } else {
        const message = error instanceof Error ? error.message : '上传失败';
        onProgress({
          ...item,
          status: 'error',
          error: message
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
