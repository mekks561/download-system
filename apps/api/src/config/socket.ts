import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { Server as HttpServer } from 'node:http';

let io: Server | null = null;

export interface SocketUser {
  id: number;
  username: string;
  role: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = (socket.handshake.auth?.token as string) || (socket.handshake.headers.authorization?.split(' ')[1]);

    if (!token) {
      return next(new Error('未授权'));
    }

    try {
      // 尝试主站用户 Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.user = { id: decoded.id, username: decoded.username || 'user', role: decoded.role };
      return next();
    } catch {
      try {
        // 尝试 GM 后台 Token
        const gmSecret = process.env.GM_JWT_SECRET || 'dev-only-gm-jwt-secret-CHANGE-ME-do-not-use-in-prod';
        const decoded = jwt.verify(token, gmSecret) as any;
        socket.user = { id: decoded.id, username: decoded.username, role: decoded.role };
        return next();
      } catch {
        return next(new Error('无效的 token'));
      }
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    console.log(`用户 ${socket.user.username} (ID: ${socket.user.id}) 已通过 Socket.IO 连接`);
    
    void socket.join(`user:${socket.user.id}`);
    
    // 如果是 GM 管理员，加入特定的 gm 广播频道
    if (socket.user.role === 'admin') {
      void socket.join('gm-broadcast');
      console.log(`管理员 ${socket.user.username} 已加入 GM 广播频道`);
    }

    socket.on('disconnect', () => {
      if (socket.user) {
        console.log(`用户 ${socket.user.username} (ID: ${socket.user.id}) 已断开 Socket.IO 连接`);
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO 未初始化');
  }
  return io;
};

export const emitDownloadProgress = (
  userId: number,
  downloadId: number,
  progress: number,
  status: string,
  speed: number,
  peers?: number,
  seeds?: number
) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('downloadProgress', {
      downloadId,
      progress,
      status,
      speed,
      peers,
      seeds,
    });
  } catch {
    // ignore
  }
};

export const emitDownloadComplete = (userId: number, downloadId: number, filename: string) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('downloadComplete', {
      downloadId,
      filename,
    });
  } catch {
    // ignore
  }
};

export const emitDownloadFailed = (userId: number, downloadId: number, errorMessage: string) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('downloadFailed', {
      downloadId,
      error: errorMessage,
    });
  } catch {
    // ignore
  }
};

export const emitSystemNotification = (userId: number, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('systemNotification', {
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
};

/**
 * 向 GM 广播频道发送实时系统日志
 */
export const emitSystemLog = (log: {
  taskId?: string | number;
  workerId: string;
  level: string;
  message: string;
  timestamp: string;
}) => {
  try {
    const ioInstance = getIO();
    ioInstance.to('gm-broadcast').emit('systemLog', log);
  } catch {
    // ignore
  }
};
