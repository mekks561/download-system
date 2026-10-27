import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy: (times: number) => (times > 3 ? null : 1000),
});
export const redisSub = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => (times > 3 ? null : 1000),
}); // Dedicated for pub/sub

redis.on('error', (err: Error) => console.error('Redis Client Error', err));
redisSub.on('error', (err: Error) => console.error('Redis Sub Client Error', err));
