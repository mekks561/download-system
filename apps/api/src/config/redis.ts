import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);
export const redisSub = new Redis(redisUrl); // Dedicated for pub/sub

redis.on('error', (err) => console.error('Redis Client Error', err));
redisSub.on('error', (err) => console.error('Redis Sub Client Error', err));
