import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { DownloadQueueService } from '../DownloadQueueService';
import { DownloadItem } from '../../types';

describe('DownloadQueueService', () => {
  let mockDownloadItem: DownloadItem;

  beforeEach(() => {
    // Reset singleton instance and clear queue
    DownloadQueueService.reset();
    const service = DownloadQueueService.getInstance();
    service.clearAll();
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
    
    mockDownloadItem = {
      id: 'test-id-1',
      url: 'http://example.com/file.zip',
      filename: 'file.zip',
      status: 'pending',
      priority: 'normal',
      totalBytes: 1024,
      downloadedBytes: 0,
      progress: 0,
      speed: 0,
      resumePosition: 0,
      createdAt: Date.now(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addToQueue', () => {
    it('should add a new item to the queue', () => {
      const service = DownloadQueueService.getInstance();
      const result = service.addToQueue(mockDownloadItem);
      
      expect(result.downloadItem.id).toBe(mockDownloadItem.id);
      expect(result.status).toBe('pending');
      expect(result.priority).toBe('normal');
    });

    it('should not add duplicate items', () => {
      const service = DownloadQueueService.getInstance();
      service.addToQueue(mockDownloadItem);
      const result = service.addToQueue(mockDownloadItem);
      
      const queue = service.getQueue();
      expect(queue.length).toBe(1);
      expect(result.downloadItem.id).toBe(mockDownloadItem.id);
    });
  });

  describe('priority sorting', () => {
    it('should sort items by priority', () => {
      const service = DownloadQueueService.getInstance();
      const lowPriorityItem: DownloadItem = { ...mockDownloadItem, id: 'low', priority: 'low' };
      const highPriorityItem: DownloadItem = { ...mockDownloadItem, id: 'high', priority: 'high' };
      const urgentPriorityItem: DownloadItem = { ...mockDownloadItem, id: 'urgent', priority: 'urgent' };
      const normalPriorityItem: DownloadItem = { ...mockDownloadItem, id: 'normal', priority: 'normal' };

      service.addToQueue(lowPriorityItem);
      service.addToQueue(highPriorityItem);
      service.addToQueue(urgentPriorityItem);
      service.addToQueue(normalPriorityItem);

      const queue = service.getQueue();
      
      expect(queue[0].priority).toBe('urgent');
      expect(queue[1].priority).toBe('high');
      expect(queue[2].priority).toBe('normal');
      expect(queue[3].priority).toBe('low');
    });

    it('should maintain FIFO order for same priority', () => {
      const service = DownloadQueueService.getInstance();
      const item1: DownloadItem = { ...mockDownloadItem, id: 'item-1', priority: 'normal' };
      const item2: DownloadItem = { ...mockDownloadItem, id: 'item-2', priority: 'normal' };
      const item3: DownloadItem = { ...mockDownloadItem, id: 'item-3', priority: 'normal' };

      service.addToQueue(item1);
      service.addToQueue(item2);
      service.addToQueue(item3);

      const queue = service.getQueue();
      
      expect(queue[0].downloadItem.id).toBe('item-1');
      expect(queue[1].downloadItem.id).toBe('item-2');
      expect(queue[2].downloadItem.id).toBe('item-3');
    });
  });

  describe('queue operations', () => {
    it('should pause an item', () => {
      const service = DownloadQueueService.getInstance();
      service.addToQueue(mockDownloadItem);
      const result = service.pauseItem(mockDownloadItem.id);
      
      expect(result).toBe(true);
      const item = service.getQueue().find(q => q.downloadItem.id === mockDownloadItem.id);
      expect(item?.status).toBe('paused');
    });

    it('should resume a paused item', () => {
      const service = DownloadQueueService.getInstance();
      service.addToQueue(mockDownloadItem);
      service.pauseItem(mockDownloadItem.id);
      
      const result = service.resumeItem(mockDownloadItem.id);
      expect(result).toBe(true);
      const item = service.getQueue().find(q => q.downloadItem.id === mockDownloadItem.id);
      expect(item?.status).toBe('pending');
    });

    it('should cancel an item', () => {
      const service = DownloadQueueService.getInstance();
      service.addToQueue(mockDownloadItem);
      const result = service.cancelItem(mockDownloadItem.id);
      
      expect(result).toBe(true);
      const item = service.getQueue().find(q => q.downloadItem.id === mockDownloadItem.id);
      expect(item?.status).toBe('cancelled');
    });

    it('should remove an item from the queue', () => {
      const service = DownloadQueueService.getInstance();
      service.addToQueue(mockDownloadItem);
      const result = service.removeFromQueue(mockDownloadItem.id);
      
      expect(result).toBe(true);
      expect(service.getQueue().length).toBe(0);
    });
  });

  describe('queue management', () => {
    it('should start the queue', () => {
      const service = DownloadQueueService.getInstance();
      service.startQueue();
      expect(service.getStatus()).toBe('running');
    });

    it('should pause the queue', () => {
      const service = DownloadQueueService.getInstance();
      service.startQueue();
      service.pauseQueue();
      expect(service.getStatus()).toBe('paused');
    });

    it('should stop the queue', () => {
      const service = DownloadQueueService.getInstance();
      service.startQueue();
      service.stopQueue();
      expect(service.getStatus()).toBe('stopped');
    });
  });

  describe('item positioning', () => {
    it('should move item to front', () => {
      const service = DownloadQueueService.getInstance();
      const item1: DownloadItem = { ...mockDownloadItem, id: 'item-1' };
      const item2: DownloadItem = { ...mockDownloadItem, id: 'item-2' };
      const item3: DownloadItem = { ...mockDownloadItem, id: 'item-3' };

      service.addToQueue(item1);
      service.addToQueue(item2);
      service.addToQueue(item3);

      service.moveToFront('item-3');
      const queue = service.getQueue();
      
      expect(queue[0].downloadItem.id).toBe('item-3');
      expect(queue[1].downloadItem.id).toBe('item-1');
      expect(queue[2].downloadItem.id).toBe('item-2');
    });

    it('should move item to back', () => {
      const service = DownloadQueueService.getInstance();
      const item1: DownloadItem = { ...mockDownloadItem, id: 'item-1' };
      const item2: DownloadItem = { ...mockDownloadItem, id: 'item-2' };
      const item3: DownloadItem = { ...mockDownloadItem, id: 'item-3' };

      service.addToQueue(item1);
      service.addToQueue(item2);
      service.addToQueue(item3);

      service.moveToBack('item-1');
      const queue = service.getQueue();
      
      expect(queue[0].downloadItem.id).toBe('item-2');
      expect(queue[1].downloadItem.id).toBe('item-3');
      expect(queue[2].downloadItem.id).toBe('item-1');
    });
  });

  describe('priority update', () => {
    it('should update item priority and re-sort', () => {
      const service = DownloadQueueService.getInstance();
      const lowItem: DownloadItem = { ...mockDownloadItem, id: 'low', priority: 'low' };
      const highItem: DownloadItem = { ...mockDownloadItem, id: 'high', priority: 'high' };

      service.addToQueue(lowItem);
      service.addToQueue(highItem);

      service.updatePriority('low', 'urgent');
      const queue = service.getQueue();
      
      expect(queue[0].downloadItem.id).toBe('low');
      expect(queue[0].priority).toBe('urgent');
      expect(queue[1].downloadItem.id).toBe('high');
    });
  });

  describe('queue stats', () => {
    it('should return correct queue stats', () => {
      const service = DownloadQueueService.getInstance();
      service.addToQueue(mockDownloadItem);
      
      const stats = service.getQueueStats();
      
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.downloading).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.error).toBe(0);
      expect(stats.cancelled).toBe(0);
    });
  });

  describe('clear completed', () => {
    it('should clear cancelled items', () => {
      const service = DownloadQueueService.getInstance();
      const cancelledItem: DownloadItem = { ...mockDownloadItem, id: 'cancelled', status: 'pending' };
      const pendingItem: DownloadItem = { ...mockDownloadItem, id: 'pending', status: 'pending' };

      service.addToQueue(cancelledItem);
      service.addToQueue(pendingItem);
      
      service.cancelItem('cancelled');
      service.clearCompleted();
      
      const queue = service.getQueue();
      
      expect(queue.length).toBe(1);
      expect(queue[0].downloadItem.id).toBe('pending');
    });
  });
});
