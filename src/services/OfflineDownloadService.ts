import { DownloadItem } from '../types';

export interface OfflineQueueItem {
  id: string;
  url: string;
  filename: string;
  totalBytes?: number;
  resumePosition: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  addedAt: number;
  status: 'queued' | 'paused' | 'waiting';
  metadata?: Record<string, unknown>;
}

export interface OfflineQueueStats {
  total: number;
  queued: number;
  paused: number;
  waiting: number;
  totalSize: number;
  estimatedTime?: number;
}

export class OfflineDownloadService {
  private static instance: OfflineDownloadService;
  private queue: OfflineQueueItem[] = [];
  private readonly STORAGE_KEY = 'offline_download_queue';
  private readonly MAX_QUEUE_SIZE = 100;
  private listeners: Set<(queue: OfflineQueueItem[]) => void> = new Set();

  private constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  public static getInstance(): OfflineDownloadService {
    if (!OfflineDownloadService.instance) {
      OfflineDownloadService.instance = new OfflineDownloadService();
    }
    return OfflineDownloadService.instance;
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.notifyListeners();
    });
    window.addEventListener('offline', () => {
      this.notifyListeners();
    });
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored) as OfflineQueueItem[];
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch {
      // ignore storage errors
    }
  }

  public addToQueue(item: Omit<OfflineQueueItem, 'id' | 'addedAt' | 'status'>): OfflineQueueItem {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error('队列已满，无法添加更多下载任务');
    }

    const existing = this.queue.find(q => q.url === item.url);
    if (existing) {
      return existing;
    }

    const newItem: OfflineQueueItem = {
      ...item,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now(),
      status: navigator.onLine ? 'queued' : 'waiting',
    };

    this.queue.push(newItem);
    this.sortQueue();
    this.saveQueue();

    return newItem;
  }

  public removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex(q => q.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  public updateItem(id: string, updates: Partial<OfflineQueueItem>): boolean {
    const index = this.queue.findIndex(q => q.id === id);
    if (index !== -1) {
      this.queue[index] = { ...this.queue[index], ...updates };
      this.sortQueue();
      this.saveQueue();
      return true;
    }
    return false;
  }

  public pauseItem(id: string): boolean {
    return this.updateItem(id, { status: 'paused' });
  }

  public resumeItem(id: string): boolean {
    return this.updateItem(id, { status: navigator.onLine ? 'queued' : 'waiting' });
  }

  public moveToFront(id: string): boolean {
    const index = this.queue.findIndex(q => q.id === id);
    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];
      this.queue.unshift(item);
      this.saveQueue();
      return true;
    }
    return false;
  }

  public moveToBack(id: string): boolean {
    const index = this.queue.findIndex(q => q.id === id);
    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];
      this.queue.push(item);
      this.saveQueue();
      return true;
    }
    return false;
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  public getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  public getQueueStats(): OfflineQueueStats {
    const stats: OfflineQueueStats = {
      total: this.queue.length,
      queued: this.queue.filter(q => q.status === 'queued').length,
      paused: this.queue.filter(q => q.status === 'paused').length,
      waiting: this.queue.filter(q => q.status === 'waiting').length,
      totalSize: this.queue.reduce((sum, q) => sum + (q.totalBytes || 0), 0),
    };

    return stats;
  }

  public getNextItems(count: number = 1): OfflineQueueItem[] {
    return this.queue
      .filter(q => q.status === 'queued')
      .slice(0, count);
  }

  public getWaitingItems(): OfflineQueueItem[] {
    return this.queue.filter(q => q.status === 'waiting');
  }

  public isInQueue(url: string): boolean {
    return this.queue.some(q => q.url === url);
  }

  public getById(id: string): OfflineQueueItem | undefined {
    return this.queue.find(q => q.id === id);
  }

  private sortQueue(): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.addedAt - b.addedAt;
    });
  }

  public addListener(listener: (queue: OfflineQueueItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getQueue()));
  }

  public convertToDownloadItem(queueItem: OfflineQueueItem): DownloadItem {
    return {
      id: queueItem.id,
      url: queueItem.url,
      filename: queueItem.filename,
      totalBytes: queueItem.totalBytes ?? 0,
      downloadedBytes: queueItem.resumePosition,
      progress: queueItem.totalBytes !== undefined && queueItem.totalBytes > 0 ? (queueItem.resumePosition / queueItem.totalBytes) * 100 : 0,
      status: queueItem.status === 'queued' ? 'pending' : queueItem.status === 'paused' ? 'paused' : 'pending',
      speed: 0,
      resumePosition: queueItem.resumePosition,
      priority: queueItem.priority,
      createdAt: queueItem.addedAt,
    };
  }

  public updateFromDownloadItem(downloadItem: Partial<DownloadItem>): void {
    if (!downloadItem.id || !downloadItem.url) return;

    const index = this.queue.findIndex(q => q.id === downloadItem.id || q.url === downloadItem.url);
    if (index !== -1) {
      const updates: Partial<OfflineQueueItem> = {};
      if (downloadItem.downloadedBytes !== undefined) {
        updates.resumePosition = downloadItem.downloadedBytes;
      }
      if (downloadItem.totalBytes !== undefined) {
        updates.totalBytes = downloadItem.totalBytes;
      }
      if (downloadItem.status !== undefined) {
        updates.status = downloadItem.status === 'completed' || downloadItem.status === 'cancelled' 
          ? 'queued' 
          : downloadItem.status === 'downloading' 
            ? 'queued' 
            : 'paused';
      }

      this.updateItem(this.queue[index].id, updates);
    }
  }

  public markAsCompleted(url: string): void {
    const index = this.queue.findIndex(q => q.url === url);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
    }
  }
}