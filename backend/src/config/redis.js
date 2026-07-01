const { createClient } = require('redis');
const { logger } = require('../utils/logger');

let redisClient = null;
let isConnected = false;

async function getRedisClient() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD || null;
  const db = process.env.REDIS_DB || 0;

  redisClient = createClient({
    url: `redis://${password ? `${password}@` : ''}${host}:${port}/${db}`,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries >= 3) {
          logger.warn('Redis重连失败超过3次，进入降级模式');
          return false;
        }
        logger.warn(`Redis重连尝试 #${retries}`);
        return Math.min(retries * 100, 1000);
      },
    },
    disableOfflineQueue: true,
  });

  redisClient.on('connect', () => {
    isConnected = true;
    logger.info(`✅ Redis连接成功: ${host}:${port}/${db}`);
  });

  redisClient.on('ready', () => {
    logger.info('✅ Redis客户端已就绪');
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    logger.error('❌ Redis连接错误', { error: err.message });
  });

  redisClient.on('end', () => {
    isConnected = false;
    logger.warn('⚠️ Redis连接已断开');
  });

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis连接失败', { error: error.message });
    throw error;
  }
}

async function testRedisConnection() {
  try {
    const client = await getRedisClient();
    const pong = await client.ping();
    logger.info(`✅ Redis ping响应: ${pong}`);
    return true;
  } catch (error) {
    logger.warn(`⚠️ Redis连接不可用: ${error.message}`);
    return false;
  }
}

async function closeRedisConnection() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('✅ Redis连接已关闭');
    } catch (error) {
      logger.error('❌ 关闭Redis连接失败', { error: error.message });
    }
  }
}

module.exports = {
  getRedisClient,
  testRedisConnection,
  closeRedisConnection,
};