import { DownloadItem, Priority } from '../types';
import { DownloadService } from './DownloadService';
import { EdgeComputingService } from './EdgeComputingService';
import { NetworkQualityService } from './NetworkQualityService';

export type QueueStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface QueueItem {
  downloadItem: DownloadItem;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled';
  priority: Priority;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  downloading: number;
  paused: number;
  completed: number;
  error: number;
  cancelled: number;
  currentSpeed: number;
  totalDownloaded: number;
  estimatedTimeRemaining: number;
}

export class DownloadQueueService {
  private static instance: DownloadQueueService | null = null;
  private queue: QueueItem[] = [];
  private status: QueueStatus = 'idle';
  private currentDownloads: Set<string> = new Set();
  private listeners: Set<(queue: QueueItem[], stats: QueueStats) => void> = new Set();
  private statsUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private downloadService: DownloadService;
  private edgeComputingService: EdgeComputingService;
  private networkQualityService: NetworkQualityService;
  private readonly MAX_HISTORY_SIZE = 100;

  private constructor() {
    this.downloadService = DownloadService.getInstance();
    this.edgeComputingService = EdgeComputingService.getInstance();
    this.networkQualityService = NetworkQualityService.getInstance();
    this.loadQueue();
    this.setupNetworkListener();
    this.startStatsUpdate();
  }

  public static getInstance(): DownloadQueueService {
    if (!DownloadQueueService.instance) {
      DownloadQueueService.instance = new DownloadQueueService();
    }
    return DownloadQueueService.instance;
  }

  public static reset(): void {
    if (DownloadQueueService.instance) {
      if (DownloadQueueService.instance.statsUpdateInterval) {
        clearInterval(DownloadQueueService.instance.statsUpdateInterval);
      }
      DownloadQueueService.instance = null;
    }
  }

  private setupNetworkListener(): void {
    this.networkQualityService.addListener(() => {
      this.adjustConcurrentDownloads();
    });

    this.edgeComputingService.addListener(() => {
      this.adjustConcurrentDownloads();
    });
  }

  private startStatsUpdate(): void {
    this.statsUpdateInterval = setInterval(() => {
      this.notifyListeners();
    }, 1000);
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem('download_queue');
      if (stored) {
        const data = JSON.parse(stored) as QueueItem[];
        this.queue = data.filter(item => item.status === 'pending' || item.status === 'paused');
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      const queueToSave = this.queue.filter(item => item.status === 'pending' || item.status === 'paused');
      localStorage.setItem('download_queue', JSON.stringify(queueToSave));
    } catch {
      // ignore
    }
  }

  private getMaxConcurrentDownloads(): number {
    return this.edgeComputingService.getRecommendedConcurrentDownloads();
  }

  private adjustConcurrentDownloads(): void {
    if (this.status !== 'running') return;

    const maxConcurrent = this.getMaxConcurrentDownloads();
    const currentCount = this.currentDownloads.size;

    if (currentCount < maxConcurrent) {
      this.startNextDownloads(maxConcurrent - currentCount);
    } else if (currentCount > maxConcurrent) {
      this.pauseExcessDownloads(currentCount - maxConcurrent);
    }
  }

  public addToQueue(item: DownloadItem): QueueItem {
    const existing = this.queue.find(q => q.downloadItem.id === item.id);
    if (existing) {
      return existing;
    }

    const queueItem: QueueItem = {
      downloadItem: item,
      status: 'pending',
      priority: item.priority || 'normal',
      addedAt: Date.now(),
    };

    this.queue.push(queueItem);
    this.sortQueue();
    this.saveQueue();
    this.notifyListeners();

    if (this.status === 'running') {
      this.startNextDownloads();
    }

    return queueItem;
  }

  public removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex(q => q.downloadItem.id === id);
    if (index !== -1) {
      const item = this.queue[index];
      if (item.status === 'downloading') {
        this.downloadService.pauseDownload(id);
        this.currentDownloads.delete(id);
      }
      this.queue.splice(index, 1);
      this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public pauseItem(id: string): boolean {
    const item = this.queue.find(q => q.downloadItem.id === id);
    if (item) {
      if (item.status === 'downloading') {
        this.downloadService.pauseDownload(id);
        this.currentDownloads.delete(id);
      }
      item.status = 'paused';
      this.saveQueue();
      this.notifyListeners();
      this.startNextDownloads();
      return true;
    }
    return false;
  }

  public resumeItem(id: string): boolean {
    const item = this.queue.find(q => q.downloadItem.id === id);
    if (item && item.status === 'paused') {
      item.status = 'pending';
      this.saveQueue();
      this.notifyListeners();
      if (this.status === 'running') {
        this.startNextDownloads();
      }
      return true;
    }
    return false;
  }

  public cancelItem(id: string): boolean {
    const item = this.queue.find(q => q.downloadItem.id === id);
    if (item) {
      if (item.status === 'downloading') {
        this.downloadService.cancelDownload(id);
        this.currentDownloads.delete(id);
      }
      item.status = 'cancelled';
      item.completedAt = Date.now();
      this.saveQueue();
      this.notifyListeners();
      this.startNextDownloads();
      return true;
    }
    return false;
  }

  public moveToFront(id: string): boolean {
    const index = this.queue.findIndex(q => q.downloadItem.id === id);
    if (index !== -1 && index > 0) {
      const item = this.queue.splice(index, 1)[0];
      this.queue.unshift(item);
      this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public moveToBack(id: string): boolean {
    const index = this.queue.findIndex(q => q.downloadItem.id === id);
    if (index !== -1 && index < this.queue.length - 1) {
      const item = this.queue.splice(index, 1)[0];
      this.queue.push(item);
      this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public updatePriority(id: string, priority: Priority): boolean {
    const item = this.queue.find(q => q.downloadItem.id === id);
    if (item) {
      item.priority = priority;
      this.sortQueue();
      this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  private sortQueue(): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    this.queue.sort((a, b) => {
      if (a.status === 'downloading') return -1;
      if (b.status === 'downloading') return 1;

      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return a.addedAt - b.addedAt;
    });
  }

  public startQueue(): void {
    if (this.status === 'running') return;

    this.status = 'running';
    this.notifyListeners();
    this.startNextDownloads();
  }

  public pauseQueue(): void {
    if (this.status !== 'running') return;

    this.status = 'paused';
    this.currentDownloads.forEach(id => {
      this.downloadService.pauseDownload(id);
    });
    this.currentDownloads.clear();
    this.queue.forEach(item => {
      if (item.status === 'downloading') {
        item.status = 'paused';
      }
    });
    this.saveQueue();
    this.notifyListeners();
  }

  public stopQueue(): void {
    this.status = 'stopped';
    this.currentDownloads.forEach(id => {
      this.downloadService.cancelDownload(id);
    });
    this.currentDownloads.clear();
    this.queue.forEach(item => {
      if (item.status === 'downloading') {
        item.status = 'pending';
      }
    });
    this.saveQueue();
    this.notifyListeners();
  }

  public clearCompleted(): void {
    this.queue = this.queue.filter(item => 
      item.status !== 'completed' && item.status !== 'cancelled' && item.status !== 'error'
    );
    this.saveQueue();
    this.notifyListeners();
  }

  public clearAll(): void {
    this.queue = [];
    this.currentDownloads.clear();
    this.saveQueue();
    this.notifyListeners();
  }

  private startNextDownloads(count: number = 1): void {
    if (this.status !== 'running') return;

    const maxConcurrent = this.getMaxConcurrentDownloads();
    const availableSlots = maxConcurrent - this.currentDownloads.size;
    const itemsToStart = Math.min(count, availableSlots);

    if (itemsToStart <= 0) return;

    const pendingItems = this.queue.filter(item => item.status === 'pending');

    for (let i = 0; i < itemsToStart && i < pendingItems.length; i++) {
      const item = pendingItems[i];
      void this.startDownload(item);
    }
  }

  private pauseExcessDownloads(count: number): void {
    const downloadingItems = this.queue.filter(item => item.status === 'downloading');
    
    for (let i = 0; i < count && i < downloadingItems.length; i++) {
      const item = downloadingItems[downloadingItems.length - 1 - i];
      this.pauseItem(item.downloadItem.id);
    }
  }

  private async startDownload(queueItem: QueueItem): Promise<void> {
    if (!this.networkQualityService.isOnline()) return;

    const { downloadItem } = queueItem;
    this.currentDownloads.add(downloadItem.id);
    queueItem.status = 'downloading';
    queueItem.startedAt = Date.now();
    this.saveQueue();
    this.notifyListeners();

    try {
      await this.downloadService.downloadFile(downloadItem, (progress) => {
        const item = this.queue.find(q => q.downloadItem.id === downloadItem.id);
        if (item) {
          item.downloadItem = { ...item.downloadItem, ...progress };
          this.notifyListeners();
        }
      });

      queueItem.status = 'completed';
      queueItem.completedAt = Date.now();
    } catch {
      queueItem.status = 'error';
      queueItem.error = '下载失败';
    } finally {
      this.currentDownloads.delete(downloadItem.id);
      this.saveQueue();
      this.notifyListeners();
      this.startNextDownloads();
    }
  }

  public getQueue(): QueueItem[] {
    return [...this.queue];
  }

  public getQueueStats(): QueueStats {
    const stats: QueueStats = {
      total: this.queue.length,
      pending: this.queue.filter(q => q.status === 'pending').length,
      downloading: this.queue.filter(q => q.status === 'downloading').length,
      paused: this.queue.filter(q => q.status === 'paused').length,
      completed: this.queue.filter(q => q.status === 'completed').length,
      error: this.queue.filter(q => q.status === 'error').length,
      cancelled: this.queue.filter(q => q.status === 'cancelled').length,
      currentSpeed: 0,
      totalDownloaded: 0,
      estimatedTimeRemaining: 0,
    };

    const downloadingItems = this.queue.filter(q => q.status === 'downloading');
    stats.currentSpeed = downloadingItems.reduce((sum, item) => sum + (item.downloadItem.speed || 0), 0);
    stats.totalDownloaded = downloadingItems.reduce((sum, item) => sum + (item.downloadItem.downloadedBytes || 0), 0);

    const totalRemaining = downloadingItems.reduce((sum, item) => {
      const remaining = (item.downloadItem.totalBytes || 0) - (item.downloadItem.downloadedBytes || 0);
      return sum + Math.max(remaining, 0);
    }, 0);

    if (stats.currentSpeed > 0) {
      stats.estimatedTimeRemaining = Math.ceil(totalRemaining / stats.currentSpeed);
    }

    return stats;
  }

  public getStatus(): QueueStatus {
    return this.status;
  }

  public getById(id: string): QueueItem | undefined {
    return this.queue.find(q => q.downloadItem.id === id);
  }

  public addListener(listener: (queue: QueueItem[], stats: QueueStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const stats = this.getQueueStats();
    this.listeners.forEach(listener => listener(this.getQueue(), stats));
  }

  public stop(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
    this.stopQueue();
    this.listeners.clear();
  }
}