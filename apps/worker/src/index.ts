import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'node:path';
import { HeartbeatService } from './services/heartbeat.service.js';
import { TaskService } from './services/task.service.js';
import { InternalServerService } from './services/internal-server.service.js';
import { WorkerPluginHost } from './plugins/WorkerPluginHost.js';
import { REDIS_CHANNELS } from '@dm/shared';

dotenv.config();

const workerId = process.env.WORKER_ID || `worker-${uuidv4().split('-')[0]}`;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const internalPort = parseInt(process.env.INTERNAL_PORT || '5002', 10);

async function bootstrap() {
  console.log(`[Worker] Initializing ${workerId}...`);

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number) => (times > 3 ? null : 1000),
  });

  redis.on('error', (err) => {
    // 仅在初次连接失败后静默，避免日志洪泛
    if ((err as any).code === 'ECONNREFUSED') {
      console.warn('[Worker] Redis 连接被拒绝，将按策略重试或保持离线模式');
    } else {
      console.error('[Worker] Redis 客户端错误:', err);
    }
  });
  
  // Initialize plugin host first
  const pluginHost = new WorkerPluginHost({
    pluginsDir: join(process.cwd(), 'plugins')
  });

  // Initialize services
  const taskService = new TaskService(redis, workerId, pluginHost);
  const heartbeat = new HeartbeatService(redis, workerId, taskService);
  const internalServer = new InternalServerService(internalPort, pluginHost);
  
  // Start services
  await heartbeat.start();
  await taskService.init();
  await internalServer.start();

  // 请求任务恢复
  try {
    await redis.publish(REDIS_CHANNELS.TASKS_RECOVERY, JSON.stringify({ workerId }));
  } catch (err) {
    console.warn('[Worker] 无法发送恢复请求 (Redis 可能未就绪):', err);
  }

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
