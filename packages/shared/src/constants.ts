export const REDIS_CHANNELS = {
  TASKS_DISPATCH: 'tasks:dispatch',
  TASKS_CONTROL: 'tasks:control',
  TASKS_UPDATES: 'tasks:updates',
  WORKER_HEARTBEAT: 'worker:heartbeat',
} as const;

export const WORKER_TTL = 30; // 30 seconds for heartbeat expiration
