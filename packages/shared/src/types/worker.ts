export type WorkerStatus = 'online' | 'offline' | 'busy';

export interface WorkerHeartbeat {
  workerId: string;
  status: WorkerStatus;
  ip: string;
  port: number;
  cpuUsage: number;
  memoryUsage: {
    total: number;
    free: number;
  };
  diskUsage: {
    total: number;
    available: number;
  };
  activeTasks: number;
  timestamp: string;
}

export interface TaskDispatchPayload {
  taskId: number;
  userId: number;
  url: string;
  protocol: 'http' | 'magnet' | 'torrent';
  filename?: string;
  metadata?: any;
  limits?: {
    speed?: number;
  };
}

export type TaskControlAction = 'pause' | 'resume' | 'cancel' | 'delete';

export interface TaskControlPayload {
  taskId: number;
  action: TaskControlAction;
}

export interface TaskUpdatePayload {
  taskId: number;
  workerId: string;
  status: string;
  progress: number;
  downloadedBytes: string; // BigInt to string
  totalBytes: string;
  speed: string;
  peers?: number;
  error?: string;
  timestamp: string;
}
