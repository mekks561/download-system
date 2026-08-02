import axios, { AxiosError } from 'axios';
import { DownloadItem } from '../types';
import { downloadBlob } from '../utils/SafariDownload';
import { formatBytes, formatSpeed, formatTime } from '../utils/format';
import { NetworkQualityService } from './NetworkQualityService';
import { OfflineDownloadService } from './OfflineDownloadService';
import { EdgeComputingService } from './EdgeComputingService';

interface WorkerProgress {
  id: string;
  type: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  status: string;
  error?: string;
}

export class DownloadService {
  private static instance: DownloadService;
  private abortControllers: Map<string, AbortController> = new Map();
  private downloadCallbacks: Map<string, ((item: Partial<DownloadItem>) => void)[]> = new Map();
  private workers: Map<string, Worker> = new Map();
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 2000;
  private readonly PROGRESS_STORAGE_KEY = 'download_progress';
  private bytesPerSecondLimit = 0;
  private networkService: NetworkQualityService;
  private offlineService: OfflineDownloadService;
  private edgeComputingService: EdgeComputingService;

  private triggerWorkflow(event: string, data: Record<string, unknown>): void {
    void (async (): Promise<void> => {
      const { WorkflowEngine } = await import('./WorkflowEngine');
      await WorkflowEngine.getInstance().triggerWorkflow(event, data);
    })();
  }
  private readonly WORKER_SUPPORTED = typeof Worker !== 'undefined';

  private constructor() {
    this.networkService = NetworkQualityService.getInstance();
    this.offlineService = OfflineDownloadService.getInstance();
    this.edgeComputingService = EdgeComputingService.getInstance();
    this.setupOnlineListener();
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      void this.handleNetworkOnline();
    });
  }

  private handleNetworkOnline(): void {
    const waitingItems = this.offlineService.getWaitingItems();
    if (waitingItems.length === 0) return;

    if (this.edgeComputingService.shouldAutoResume()) {
      for (const item of waitingItems) {
        this.offlineService.resumeItem(item.id);
      }
    }
  }

  public static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  public setSpeedLimit(bytesPerSecond: number): void {
    this.bytesPerSecondLimit = bytesPerSecond;
  }

  public getSpeedLimit(): number {
    return this.bytesPerSecondLimit;
  }

  public async downloadFile(
    item: DownloadItem,
    onProgress: (progress: Partial<DownloadItem>) => void,
    retryCount: number = 0
  ): Promise<void> {
    if (!this.networkService.isOnline()) {
      this.addToOfflineQueue(item);
      onProgress({
        ...item,
        status: 'pending',
        error: '网络离线，已加入离线队列',
      });
      return;
    }

    if (retryCount === 0) {
      this.triggerWorkflow('download_added', { download: item });
    }

    if (this.WORKER_SUPPORTED && item.totalBytes && item.totalBytes > 10 * 1024 * 1024) {
      await this.downloadWithWorker(item, onProgress, retryCount);
    } else {
      await this.downloadDirectly(item, onProgress, retryCount);
    }
  }

  private async downloadWithWorker(
    item: DownloadItem,
    onProgress: (progress: Partial<DownloadItem>) => void,
    retryCount: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../workers/download.worker.ts', import.meta.url));
      this.workers.set(item.id, worker);

      let lastProgressTime = Date.now();
      let lastProgressBytes = item.resumePosition;

      worker.onmessage = (e: MessageEvent<WorkerProgress>) => {
        const progress = e.data;

        const currentTime = Date.now();
        const timeDiff = currentTime - lastProgressTime;
        const bytesDiff = progress.downloadedBytes - lastProgressBytes;
        const speed = timeDiff > 0 ? (bytesDiff / timeDiff) * 1000 : 0;

        lastProgressTime = currentTime;
        lastProgressBytes = progress.downloadedBytes;

        this.saveDownloadProgress(item.url, progress.downloadedBytes, progress.totalBytes, item.filename);
        this.updateOfflineProgress(item, progress.downloadedBytes, progress.totalBytes);

        onProgress({
          ...item,
          status: progress.status as DownloadItem['status'],
          downloadedBytes: progress.downloadedBytes,
          totalBytes: progress.totalBytes,
          progress: progress.progress,
          resumePosition: item.resumePosition,
          speed,
          error: progress.error,
        });

        if (progress.status === 'completed') {
          this.workers.delete(item.id);
          worker.terminate();
          this.triggerWorkflow('download_completed', { download: item });
          resolve();
        } else if (progress.status === 'error') {
          this.workers.delete(item.id);
          worker.terminate();
          this.triggerWorkflow('download_failed', { download: { ...item, error: progress.error } });
          reject(new Error(progress.error || '下载失败'));
        } else if (progress.status === 'cancelled') {
          this.workers.delete(item.id);
          worker.terminate();
          reject(new Error('cancel'));
        }
      };

      worker.onerror = () => {
        this.workers.delete(item.id);
        worker.terminate();
        this.downloadDirectly(item, onProgress, retryCount).then(resolve).catch(reject);
      };

      worker.postMessage({
        type: 'start',
        id: item.id,
        url: item.url,
        resumePosition: item.resumePosition,
      });
    });
  }

  private async downloadDirectly(
    item: DownloadItem,
    onProgress: (progress: Partial<DownloadItem>) => void,
    retryCount: number
  ): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(item.id, controller);

    let lastProgressTime = Date.now();
    let lastProgressBytes = item.resumePosition;
    const chunks: BlobPart[] = [];

    const adaptiveSpeedLimit = this.getAdaptiveSpeedLimit();

    try {
      const headers: Record<string, string> = {};
      if (item.resumePosition > 0) {
        headers['Range'] = `bytes=${item.resumePosition}-`;
      }

      const response = await fetch(item.url, {
        signal: controller.signal,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      const total = contentLengthHeader ? parseInt(contentLengthHeader) + item.resumePosition : item.totalBytes;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const effectiveLimit = this.bytesPerSecondLimit > 0 ? this.bytesPerSecondLimit : adaptiveSpeedLimit;
      const speedLimiter = new SpeedLimiter(effectiveLimit);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (effectiveLimit > 0) {
          await speedLimiter.throttle((value as Uint8Array).length);
        }

        chunks.push(value);
        const downloaded = item.resumePosition + chunks.reduce((sum, chunk) => {
          if (chunk instanceof Uint8Array) {
            return sum + chunk.length;
          } else if (chunk instanceof ArrayBuffer) {
            return sum + chunk.byteLength;
          } else if (ArrayBuffer.isView(chunk)) {
            return sum + chunk.byteLength;
          } else if (typeof chunk === 'string') {
            return sum + chunk.length * 2;
          }
          return sum;
        }, 0);
        const progress = total > 0 ? (downloaded / total) * 100 : 0;

        const currentTime = Date.now();
        const timeDiff = currentTime - lastProgressTime;
        const bytesDiff = downloaded - lastProgressBytes;
        const speed = timeDiff > 0 ? (bytesDiff / timeDiff) * 1000 : 0;

        lastProgressTime = currentTime;
        lastProgressBytes = downloaded;

        this.saveDownloadProgress(item.url, downloaded, total, item.filename);
        this.updateOfflineProgress(item, downloaded, total);

        onProgress({
          ...item,
          status: 'downloading',
          downloadedBytes: downloaded,
          totalBytes: total,
          progress: Math.min(progress, 100),
          resumePosition: item.resumePosition,
          speed,
        });
      }

      const blob = new Blob(chunks);
      this.handleSuccess(item, blob, total, onProgress);

    } catch (error: unknown) {
      await this.handleError(item, error, onProgress, retryCount);
    } finally {
      this.abortControllers.delete(item.id);
    }
  }

  private getAdaptiveSpeedLimit(): number {
    return this.edgeComputingService.getAdaptiveSpeedLimit();
  }

  private addToOfflineQueue(item: DownloadItem): void {
    try {
      this.offlineService.addToQueue({
        url: item.url,
        filename: item.filename,
        totalBytes: item.totalBytes,
        resumePosition: item.resumePosition,
        priority: item.priority || 'normal',
      });
    } catch {
      // ignore
    }
  }

  private updateOfflineProgress(item: DownloadItem, downloaded: number, total: number): void {
    this.offlineService.updateFromDownloadItem({
      ...item,
      downloadedBytes: downloaded,
      totalBytes: total,
    });
  }

  private handleSuccess(
    item: DownloadItem,
    blob: Blob,
    total: number,
    onProgress: (progress: Partial<DownloadItem>) => void
  ): void {
    downloadBlob(blob, item.filename);

    this.clearDownloadProgress(item.url);
    this.offlineService.markAsCompleted(item.url);

    const totalDownloaded = item.resumePosition + blob.size;

    const completedItem = {
      ...item,
      status: 'completed' as const,
      progress: 100,
      downloadedBytes: totalDownloaded,
      totalBytes: total || totalDownloaded,
      resumePosition: 0,
      completedAt: Date.now(),
    };

    onProgress(completedItem);
    this.triggerWorkflow('download_completed', { download: completedItem });
  }

  private async handleError(
    item: DownloadItem,
    error: unknown,
    onProgress: (progress: Partial<DownloadItem>) => void,
    retryCount: number
  ): Promise<void> {
    // 检测暂停/取消：fetch 中断会抛出 DOMException(name='AbortError')，原因存于 signal.reason；
    // Worker 路径则用 new Error('cancel') 拒绝。需同时兼容两种来源。
    const controller = this.abortControllers.get(item.id);
    const signalReason = controller?.signal.reason as 'pause' | 'cancel' | undefined;
    const isAbortError = (error as { name?: string } | null)?.name === 'AbortError';
    const isPaused = isAbortError
      ? signalReason === 'pause'
      : (error instanceof Error && error.message === 'pause');
    const isCancelled = isAbortError
      ? signalReason === 'cancel'
      : (error instanceof Error && error.message === 'cancel');

    if (isPaused || isCancelled) {
      onProgress({
        ...item,
        status: isPaused ? 'paused' : 'cancelled',
        speed: 0,
      });
      return;
    }

    const axiosError = error as AxiosError;
    const shouldRetry = this.shouldRetry(axiosError, retryCount);

    if (shouldRetry) {
      const delay = this.getRetryDelay(retryCount);
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
    const errorItem = {
      ...item,
      status: 'error' as const,
      error: errorMessage,
      speed: 0,
    };
    onProgress(errorItem);
    this.triggerWorkflow('download_failed', { download: errorItem });
  }

  private shouldRetry(error: AxiosError, retryCount: number): boolean {
    if (retryCount >= this.MAX_RETRIES) {
      return false;
    }

    if (!this.networkService.isOnline()) {
      return false;
    }

    if (!this.networkService.isConnectionStable()) {
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

  private getRetryDelay(retryCount: number): number {
    const quality = this.networkService.getQuality();
    const baseDelay = this.RETRY_DELAY * Math.pow(2, retryCount);

    switch (quality) {
      case 'poor':
        return baseDelay * 2;
      case 'fair':
        return baseDelay * 1.5;
      case 'good':
        return baseDelay;
      case 'excellent':
        return baseDelay * 0.5;
      case 'offline':
        return baseDelay * 3;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
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

    if (error instanceof Error) {
      if (error.message.startsWith('HTTP error')) {
        const status = parseInt(error.message.replace('HTTP error ', ''));
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
      return error.message;
    }

    return '下载失败';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public pauseDownload(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort('pause');
    }

    const worker = this.workers.get(id);
    if (worker) {
      worker.postMessage({ type: 'pause', id });
    }
  }

  public cancelDownload(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort('cancel');
    }

    const worker = this.workers.get(id);
    if (worker) {
      worker.postMessage({ type: 'cancel', id });
    }
  }

  public isDownloading(id: string): boolean {
    return this.abortControllers.has(id) || this.workers.has(id);
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
      // ignore storage errors
    }
  }

  private removeProgress(id: string): void {
    try {
      const storage = this.getProgressStorage();
      delete storage[id];
      localStorage.setItem(this.PROGRESS_STORAGE_KEY, JSON.stringify(storage));
    } catch {
      // ignore storage errors
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
      // ignore storage errors
    }
  }

  public clearDownloadProgress(url: string): void {
    try {
      const hash = this.hashUrl(url);
      this.removeProgress(hash);
    } catch {
      // ignore storage errors
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
}
