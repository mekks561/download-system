const { getRedisClient } = require('../config/redis');
const { logger } = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.defaultTTL = 3600;
  }

  async init() {
    try {
      this.client = await getRedisClient();
      logger.info('✅ 缓存服务初始化成功');
    } catch (error) {
      logger.warn('⚠️ 缓存服务初始化失败，将使用降级模式（直接查询数据库）');
      logger.warn('💡 如需启用缓存，请安装并启动Redis服务');
    }
  }

  async get(key) {
    if (!this.client) return null;
    
    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('❌ 获取缓存失败', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.client) return false;
    
    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.set(key, serialized, { EX: ttl });
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('❌ 设置缓存失败', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    if (!this.client) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('❌ 删除缓存失败', { key, error: error.message });
      return false;
    }
  }

  async exists(key) {
    if (!this.client) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('❌ 检查缓存存在失败', { key, error: error.message });
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.client) return false;
    
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('❌ 设置缓存过期时间失败', { key, error: error.message });
      return false;
    }
  }

  async flush() {
    if (!this.client) return false;
    
    try {
      await this.client.flushDb();
      logger.info('✅ 缓存已清空');
      return true;
    } catch (error) {
      logger.error('❌ 清空缓存失败', { error: error.message });
      return false;
    }
  }

  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      logger.debug(`🔄 命中缓存: ${key}`);
      return cached;
    }

    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      await this.set(key, data, ttl);
    }

    return data;
  }

  getUserDownloadStatsKey(userId) {
    return `user:${userId}:download_stats`;
  }

  getUserUploadStatsKey(userId) {
    return `user:${userId}:upload_stats`;
  }

  getUserDownloadsKey(userId) {
    return `user:${userId}:downloads`;
  }

  getUserUploadsKey(userId) {
    return `user:${userId}:uploads`;
  }

  getUserCategoriesKey(userId) {
    return `user:${userId}:categories`;
  }

  getUserSearchHistoryKey(userId) {
    return `user:${userId}:search_history`;
  }

  getDownloadTaskKey(taskId) {
    return `task:download:${taskId}`;
  }

  getUploadTaskKey(taskId) {
    return `task:upload:${taskId}`;
  }

  getShareTokenKey(token) {
    return `share:token:${token}`;
  }

  getSystemStatsKey() {
    return 'system:stats';
  }

  isAvailable() {
    return this.client !== null;
  }
}

const cacheService = new CacheService();

module.exports = cacheService;