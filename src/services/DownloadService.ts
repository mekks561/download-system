import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { DownloadItem, DownloadStatus } from '../types';
import { downloadBlob } from '../utils/SafariDownload';

export class DownloadService {
  private static instance: DownloadService;
  private abortControllers: Map<string, AbortController> = new Map();
  private downloadCallbacks: Map<string, ((item: Partial<DownloadItem>) => void)[]> = new Map();
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 2000;

  private constructor() {}

  public static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  public async downloadFile(
    item: DownloadItem,
    onProgress: (progress: Partial<DownloadItem>) => void,
    retryCount: number = 0
  ): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(item.id, controller);

    try {
      const config: AxiosRequestConfig = {
        url: item.url,
        method: 'GET',
        responseType: 'blob',
        signal: controller.signal,
        headers: {
          Range: item.resumePosition > 0 
            ? `bytes=${item.resumePosition}-` 
            : undefined,
        },
        timeout: 30000,
        onDownloadProgress: (progressEvent) => {
          const total = this.getTotalBytes(progressEvent, item);
          const downloaded = item.resumePosition + (progressEvent.loaded || 0);
          const progress = total > 0 ? (downloaded / total) * 100 : 0;
          
          onProgress({
            ...item,
            status: 'downloading',
            downloadedBytes: downloaded,
            totalBytes: total,
            progress: Math.min(progress, 100),
            resumePosition: item.resumePosition,
          });
        },
      };

      const response = await axios(config);
      
      await this.handleSuccess(item, response, onProgress);

    } catch (error: any) {
      await this.handleError(item, error, onProgress, retryCount);
    } finally {
      this.abortControllers.delete(item.id);
    }
  }

  private getTotalBytes(progressEvent: any, item: DownloadItem): number {
    if (progressEvent.total) {
      return progressEvent.total;
    }
    if (item.totalBytes > 0) {
      return item.totalBytes;
    }
    return 0;
  }

  private async handleSuccess(
    item: DownloadItem,
    response: AxiosResponse<Blob>,
    onProgress: (progress: Partial<DownloadItem>) => void
  ): Promise<void> {
    const blob = response.data;
    
    downloadBlob(blob, item.filename);

    const contentLength = this.getContentLength(response);
    const totalDownloaded = item.resumePosition + (contentLength || blob.size);

    onProgress({
      ...item,
      status: 'completed' as DownloadStatus,
      progress: 100,
      downloadedBytes: totalDownloaded,
      totalBytes: item.totalBytes || totalDownloaded,
      resumePosition: 0,
      completedAt: Date.now(),
    });
  }

  private getContentLength(response: AxiosResponse<Blob>): number | undefined {
    const contentLengthHeader = response.headers['content-length'];
    if (typeof contentLengthHeader === 'string') {
      return parseInt(contentLengthHeader);
    }
    return undefined;
  }

  private async handleError(
    item: DownloadItem,
    error: any,
    onProgress: (progress: Partial<DownloadItem>) => void,
    retryCount: number
  ): Promise<void> {
    if (error.code === 'ERR_CANCELED') {
      const isPaused = error.message === 'pause';
      onProgress({ 
        ...item, 
        status: isPaused ? 'paused' as DownloadStatus : 'cancelled' as DownloadStatus,
        speed: 0,
      });
      return;
    }

    const shouldRetry = this.shouldRetry(error, retryCount);
    
    if (shouldRetry) {
      const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
      onProgress({
        ...item,
        status: 'retrying' as DownloadStatus,
        error: `下载失败，正在重试 (${retryCount + 1}/${this.MAX_RETRIES})`,
      });
      
      await this.delay(delay);
      await this.downloadFile(item, onProgress, retryCount + 1);
    } else {
      const errorMessage = this.getErrorMessage(error);
      onProgress({ 
        ...item, 
        status: 'error' as DownloadStatus, 
        error: errorMessage,
        speed: 0,
      });
    }
  }

  private shouldRetry(error: any, retryCount: number): boolean {
    if (retryCount >= this.MAX_RETRIES) {
      return false;
    }

    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ERR_NETWORK',
      'ERR_TIMED_OUT',
    ];

    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }

    if (error.response) {
      const status = error.response.status;
      if (status >= 500 || status === 408 || status === 429) {
        return true;
      }
    }

    return false;
  }

  private getErrorMessage(error: any): string {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 403:
          return '访问被拒绝，请检查权限';
        case 404:
          return '文件不存在';
        case 416:
          return '服务器不支持断点续传';
        case 500:
          return '服务器内部错误';
        case 503:
          return '服务暂时不可用';
        default:
          return `HTTP错误 ${status}`;
      }
    }

    if (error.code) {
      switch (error.code) {
        case 'ERR_NETWORK':
          return '网络连接失败';
        case 'ETIMEDOUT':
        case 'ERR_TIMED_OUT':
          return '请求超时';
        case 'ECONNRESET':
          return '连接被重置';
        default:
          return error.code;
      }
    }

    return error.message || '下载失败';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public pauseDownload(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort('pause');
    }
  }

  public cancelDownload(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort('cancel');
    }
  }

  public isDownloading(id: string): boolean {
    return this.abortControllers.has(id);
  }

  public generateId(): string {
    return `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  public async checkResumeSupport(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, { timeout: 10000 });
      const acceptRanges = response.headers['accept-ranges'];
      return acceptRanges === 'bytes';
    } catch {
      return false;
    }
  }
}