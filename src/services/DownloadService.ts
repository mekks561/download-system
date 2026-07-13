import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, AxiosProgressEvent } from 'axios';
import { DownloadItem } from '../types';
import { downloadBlob } from '../utils/SafariDownload';
import { formatBytes, formatSpeed, formatTime } from '../utils/format';

export class DownloadService {
  private static instance: DownloadService;
  private abortControllers: Map<string, AbortController> = new Map();
  private downloadCallbacks: Map<string, ((item: Partial<DownloadItem>) => void)[]> = new Map();
  private speedLimiters: Map<string, SpeedLimiter> = new Map();
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 2000;
  private readonly PROGRESS_STORAGE_KEY = 'download_progress';
  private bytesPerSecondLimit = 0;

  private constructor() {}

  public static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  public setSpeedLimit(bytesPerSecond: number): void {
    this.bytesPerSecondLimit = bytesPerSecond;
    this.speedLimiters.forEach((limiter) => {
      limiter.setLimit(bytesPerSecond);
    });
  }

  public getSpeedLimit(): number {
    return this.bytesPerSecondLimit;
  }

  public async downloadFile(
    item: DownloadItem,
    onProgress: (progress: Partial<DownloadItem>) => void,
    retryCount: number = 0
  ): Promise<void> {
    const controller = new AbortController();
    const speedLimiter = new SpeedLimiter(this.bytesPerSecondLimit);
    this.abortControllers.set(item.id, controller);
    this.speedLimiters.set(item.id, speedLimiter);

    let lastProgressTime = Date.now();
    let lastProgressBytes = item.resumePosition;

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
        onDownloadProgress: async (progressEvent) => {
          const total = this.getTotalBytes(progressEvent, item);
          const downloaded = item.resumePosition + (progressEvent.loaded || 0);
          const progress = total > 0 ? (downloaded / total) * 100 : 0;
          
          const currentTime = Date.now();
          const timeDiff = currentTime - lastProgressTime;
          const bytesDiff = downloaded - lastProgressBytes;
          const speed = timeDiff > 0 ? (bytesDiff / timeDiff) * 1000 : 0;
          
          lastProgressTime = currentTime;
          lastProgressBytes = downloaded;

          if (this.bytesPerSecondLimit > 0) {
            await speedLimiter.throttle(bytesDiff);
          }
          
          this.saveDownloadProgress(item.url, downloaded, total, item.filename);
          
          onProgress({
            ...item,
            status: 'downloading',
            downloadedBytes: downloaded,
            totalBytes: total,
            progress: Math.min(progress, 100),
            resumePosition: item.resumePosition,
            speed,
          });
        },
      };

      const response = await axios<Blob>(config);

      this.handleSuccess(item, response, onProgress);

    } catch (error: unknown) {
      await this.handleError(item, error, onProgress, retryCount);
    } finally {
      this.abortControllers.delete(item.id);
      this.speedLimiters.delete(item.id);
    }
  }

  private getTotalBytes(progressEvent: AxiosProgressEvent, item: DownloadItem): number {
    if (progressEvent.total) {
      return progressEvent.total;
    }
    if (item.totalBytes > 0) {
      return item.totalBytes;
    }
    return 0;
  }

  private handleSuccess(
    item: DownloadItem,
    response: AxiosResponse<Blob>,
    onProgress: (progress: Partial<DownloadItem>) => void
  ): void {
    const blob = response.data;

    downloadBlob(blob, item.filename);

    this.clearDownloadProgress(item.url);

    const contentLength = this.getContentLength(response);
    const totalDownloaded = item.resumePosition + (contentLength || blob.size);

    onProgress({
      ...item,
      status: 'completed',
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
    error: unknown,
    onProgress: (progress: Partial<DownloadItem>) => void,
    retryCount: number
  ): Promise<void> {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ERR_CANCELED') {
        const isPaused = error.message === 'pause';
        onProgress({
          ...item,
          status: isPaused ? 'paused' : 'cancelled',
          speed: 0,
        });
        return;
      }

      const shouldRetry = this.shouldRetry(error, retryCount);

      if (shouldRetry) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
        onProgress({
          ...item,
          status: 'retrying',
          error: `下载失败，正在重试 (${retryCount + 1}/${this.MAX_RETRIES})`,
        });

        await this.delay(delay);
        await this.downloadFile(item, onProgress, retryCount + 1);
        return;
      }

      const errorMessage = this.getErrorMessage(error);
      onProgress({
        ...item,
        status: 'error',
        error: errorMessage,
        speed: 0,
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : '下载失败';
    onProgress({
      ...item,
      status: 'error',
      error: errorMessage,
      speed: 0,
    });
  }

  private shouldRetry(error: AxiosError, retryCount: number): boolean {
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

  private getErrorMessage(error: AxiosError): string {
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

  private getProgressStorage(): Record<string, { resumePosition: number; totalBytes: number; filename: string }> {
    try {
      const stored = localStorage.getItem(this.PROGRESS_STORAGE_KEY);
      return stored ? JSON.parse(stored) as Record<string, { resumePosition: number; totalBytes: number; filename: string }> : {};
    } catch {
      return {};
    }
  }

  private saveProgress(id: string, progress: { resumePosition: number; totalBytes: number; filename: string }): void {
    try {
      const storage = this.getProgressStorage();
      storage[id] = progress;
      localStorage.setItem(this.PROGRESS_STORAGE_KEY, JSON.stringify(storage));
    } catch {
    }
  }

  private removeProgress(id: string): void {
    try {
      const storage = this.getProgressStorage();
      delete storage[id];
      localStorage.setItem(this.PROGRESS_STORAGE_KEY, JSON.stringify(storage));
    } catch {
    }
  }

  public getSavedProgress(url: string): { resumePosition: number; totalBytes: number; filename: string } | null {
    try {
      const storage = this.getProgressStorage();
      const hash = this.hashUrl(url);
      return storage[hash] || null;
    } catch {
      return null;
    }
  }

  public saveDownloadProgress(url: string, resumePosition: number, totalBytes: number, filename: string): void {
    try {
      const hash = this.hashUrl(url);
      this.saveProgress(hash, { resumePosition, totalBytes, filename });
    } catch {
    }
  }

  public clearDownloadProgress(url: string): void {
    try {
      const hash = this.hashUrl(url);
      this.removeProgress(hash);
    } catch {
    }
  }

  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `url_${Math.abs(hash)}`;
  }

  public formatFileSize(bytes: number): string {
    return formatBytes(bytes);
  }

  public formatSpeed(bytesPerSecond: number): string {
    return formatSpeed(bytesPerSecond);
  }

  public formatTime(seconds: number): string {
    return formatTime(seconds);
  }

  public async checkResumeSupport(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, { timeout: 10000 });
      const acceptRanges = response.headers['accept-ranges'] as string | undefined;
      return acceptRanges === 'bytes';
    } catch {
      return false;
    }
  }
}

class SpeedLimiter {
  private bytesPerSecond: number;
  private downloadedBytes: number = 0;
  private startTime: number = Date.now();

  constructor(bytesPerSecond: number) {
    this.bytesPerSecond = bytesPerSecond;
  }

  setLimit(bytesPerSecond: number): void {
    this.bytesPerSecond = bytesPerSecond;
  }

  async throttle(bytesDownloaded: number): Promise<void> {
    if (this.bytesPerSecond <= 0) return;

    this.downloadedBytes += bytesDownloaded;
    const elapsedTime = (Date.now() - this.startTime) / 1000;

    if (elapsedTime > 0) {
      const expectedTime = this.downloadedBytes / this.bytesPerSecond;
      const delay = (expectedTime - elapsedTime) * 1000;

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  reset(): void {
    this.downloadedBytes = 0;
    this.startTime = Date.now();
  }
}