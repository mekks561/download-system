const { getRedisClient } = require('../config/redis');

const CACHE_KEYS = {
  USER_DOWNLOAD_STATS: (userId) => `user:${userId}:download_stats`,
  USER_UPLOAD_STATS: (userId) => `user:${userId}:upload_stats`,
  USER_STORAGE: (userId) => `user:${userId}:storage`,
  DOWNLOAD_TREND: (userId, timeRange) => `user:${userId}:download_trend:${timeRange}`,
  UPLOAD_TREND: (userId, timeRange) => `user:${userId}:upload_trend:${timeRange}`,
  RECENT_DOWNLOADS: (userId) => `user:${userId}:recent_downloads`,
  RECENT_UPLOADS: (userId) => `user:${userId}:recent_uploads`,
};

const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
};

class CacheService {
  constructor() {}

  async get(key) {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set(key, value, ttl = CACHE_TTL.MEDIUM) {
    try {
      const client = await getRedisClient();
      await client.set(key, JSON.stringify(value), { EX: ttl });
      return true;
    } catch {
      return false;
    }
  }

  async delete(key) {
    try {
      const client = await getRedisClient();
      await client.del(key);
      return true;
    } catch {
      return false;
    }
  }

  async clearUserCache(userId) {
    try {
      const client = await getRedisClient();
      const pattern = `user:${userId}:*`;
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch {
      return false;
    }
  }

  async getDownloadStats(userId) {
    const key = CACHE_KEYS.USER_DOWNLOAD_STATS(userId);
    return this.get(key);
  }

  async setDownloadStats(userId, stats) {
    const key = CACHE_KEYS.USER_DOWNLOAD_STATS(userId);
    return this.set(key, stats, CACHE_TTL.MEDIUM);
  }

  async getUploadStats(userId) {
    const key = CACHE_KEYS.USER_UPLOAD_STATS(userId);
    return this.get(key);
  }

  async setUploadStats(userId, stats) {
    const key = CACHE_KEYS.USER_UPLOAD_STATS(userId);
    return this.set(key, stats, CACHE_TTL.MEDIUM);
  }

  async getStorageUsage(userId) {
    const key = CACHE_KEYS.USER_STORAGE(userId);
    return this.get(key);
  }

  async setStorageUsage(userId, usage) {
    const key = CACHE_KEYS.USER_STORAGE(userId);
    return this.set(key, usage, CACHE_TTL.SHORT);
  }

  async getDownloadTrend(userId, timeRange) {
    const key = CACHE_KEYS.DOWNLOAD_TREND(userId, timeRange);
    return this.get(key);
  }

  async setDownloadTrend(userId, timeRange, data) {
    const key = CACHE_KEYS.DOWNLOAD_TREND(userId, timeRange);
    return this.set(key, data, CACHE_TTL.LONG);
  }

  async getUploadTrend(userId, timeRange) {
    const key = CACHE_KEYS.UPLOAD_TREND(userId, timeRange);
    return this.get(key);
  }

  async setUploadTrend(userId, timeRange, data) {
    const key = CACHE_KEYS.UPLOAD_TREND(userId, timeRange);
    return this.set(key, data, CACHE_TTL.LONG);
  }

  async getRecentDownloads(userId) {
    const key = CACHE_KEYS.RECENT_DOWNLOADS(userId);
    return this.get(key);
  }

  async setRecentDownloads(userId, downloads) {
    const key = CACHE_KEYS.RECENT_DOWNLOADS(userId);
    return this.set(key, downloads, CACHE_TTL.MEDIUM);
  }

  async getRecentUploads(userId) {
    const key = CACHE_KEYS.RECENT_UPLOADS(userId);
    return this.get(key);
  }

  async setRecentUploads(userId, uploads) {
    const key = CACHE_KEYS.RECENT_UPLOADS(userId);
    return this.set(key, uploads, CACHE_TTL.MEDIUM);
  }

  async incrDownloadCount(userId) {
    try {
      const client = await getRedisClient();
      const key = `user:${userId}:download_count`;
      await client.incr(key);
      await client.expire(key, CACHE_TTL.LONG);
      return true;
    } catch {
      return false;
    }
  }

  async incrUploadCount(userId) {
    try {
      const client = await getRedisClient();
      const key = `user:${userId}:upload_count`;
      await client.incr(key);
      await client.expire(key, CACHE_TTL.LONG);
      return true;
    } catch {
      return false;
    }
  }

  async addBytesDownloaded(userId, bytes) {
    try {
      const client = await getRedisClient();
      const key = `user:${userId}:total_downloaded_bytes`;
      await client.incrBy(key, bytes);
      await client.expire(key, CACHE_TTL.LONG);
      return true;
    } catch {
      return false;
    }
  }

  async addBytesUploaded(userId, bytes) {
    try {
      const client = await getRedisClient();
      const key = `user:${userId}:total_uploaded_bytes`;
      await client.incrBy(key, bytes);
      await client.expire(key, CACHE_TTL.LONG);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = CacheService;
