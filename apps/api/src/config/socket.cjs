const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:8080'],
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('未授权'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, username: decoded.username, role: decoded.role };
      next();
    } catch {
      return next(new Error('无效的 token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`用户 ${socket.user.username} (ID: ${socket.user.id}) 已连接`);
    
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
      console.log(`用户 ${socket.user.username} (ID: ${socket.user.id}) 已断开连接`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO 未初始化');
  }
  return io;
};

const emitDownloadProgress = (userId, downloadId, progress, status) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('downloadProgress', {
      downloadId,
      progress,
      status
    });
  } catch {
    // ignore
  }
};

const emitDownloadComplete = (userId, downloadId, filename) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('downloadComplete', {
      downloadId,
      filename
    });
  } catch {
    // ignore
  }
};

const emitDownloadFailed = (userId, downloadId, errorMessage) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('downloadFailed', {
      downloadId,
      error: errorMessage
    });
  } catch {
    // ignore
  }
};

const emitUploadProgress = (userId, uploadId, progress, status) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('uploadProgress', {
      uploadId,
      progress,
      status
    });
  } catch {
    // ignore
  }
};

const emitUploadComplete = (userId, uploadId, filename) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('uploadComplete', {
      uploadId,
      filename
    });
  } catch {
    // ignore
  }
};

const emitUploadFailed = (userId, uploadId, errorMessage) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('uploadFailed', {
      uploadId,
      error: errorMessage
    });
  } catch {
    // ignore
  }
};

const emitSystemNotification = (userId, title, message, type = 'info') => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('systemNotification', {
      title,
      message,
      type,
      timestamp: new Date().toISOString()
    });
  } catch {
    // ignore
  }
};

module.exports = {
  initSocket,
  getIO,
  emitDownloadProgress,
  emitDownloadComplete,
  emitDownloadFailed,
  emitUploadProgress,
  emitUploadComplete,
  emitUploadFailed,
  emitSystemNotification
};