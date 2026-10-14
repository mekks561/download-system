import Redis from 'ioredis';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { HeartbeatService } from './services/heartbeat.service.js';
import { TaskService } from './services/task.service.js';
import { InternalServerService } from './services/internal-server.service.js';
import { REDIS_CHANNELS } from '@dm/shared';

dotenv.config();

const workerId = process.env.WORKER_ID || `worker-${uuidv4().split('-')[0]}`;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const internalPort = parseInt(process.env.INTERNAL_PORT || '5002', 10);

async function bootstrap() {
  console.log(`[Worker] Initializing ${workerId}...`);

  const redis = new Redis(redisUrl);
  
  // Initialize services
  const taskService = new TaskService(redis, workerId);
  const heartbeat = new HeartbeatService(redis, workerId, taskService);
  const internalServer = new InternalServerService(internalPort);
  
  // Start services
  await heartbeat.start();
  await taskService.init();
  await internalServer.start();

  // 请求任务恢复
  await redis.publish(REDIS_CHANNELS.TASKS_RECOVERY, JSON.stringify({ workerId }));

  console.log(`[Worker] ${workerId} is up and running.`);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('[Worker] Shutting down...');
    heartbeat.stop();
    internalServer.stop();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  console.error('[Worker] Fatal error during bootstrap:', err);
  process.exit(1);
});
