const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initializeDatabase, testConnection, getPool } = require('./config/mysql');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { securityMiddleware } = require('./middleware/security');
const schedulerService = require('./services/SchedulerService');
const cacheService = require('./services/CacheService');
const { closeRedisConnection } = require('./config/redis');
const { initSocket } = require('./config/socket');
const { runMigrations } = require('./database/migration');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

securityMiddleware(app);

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

const v1Routes = require('./routes/v1/api');
const swaggerRoutes = require('./routes/swagger');

app.use('/api/v1', v1Routes);
app.use('/api', apiRoutes);
app.use('/gm', require('./routes/gm'));
app.use('/', swaggerRoutes);

app.use(notFound);
app.use(errorLogger);
app.use(errorHandler);

async function startServer() {
  logger.info('🚀 启动下载管理系统后端服务...');
  logger.info('📦 初始化MySQL数据库...');
  
  try {
    const connected = await testConnection();
    
    if (connected) {
      logger.info('✅ 服务器启动成功！', {
        port: PORT,
        database: process.env.MYSQL_DATABASE,
        host: `${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}`
      });
      
      // 执行数据库迁移
      const pool = await getPool();
      await runMigrations(pool);
      
      // 初始化缓存服务
      await cacheService.init();
      
      // 启动计划任务执行器
      schedulerService.start();
      
      // 初始化 Socket.IO
      initSocket(server);
      
      server.listen(PORT, () => {
        logger.info(`✅ 服务已在 http://localhost:${PORT} 运行！`);
        console.log(`\n🌐 后端API地址: http://localhost:${PORT}`);
        console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
        console.log(`📈 指标监控: http://localhost:${PORT}/api/metrics`);
        console.log(`💾 缓存状态: ${cacheService.isAvailable() ? '已启用' : '未启用'}`);
        console.log(`🔌 WebSocket: 已启用`);
      });
    } else {
      logger.error('❌ 无法连接到MySQL数据库，服务启动失败。');
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ 服务器启动失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', { error: error.message, stack: error.stack });
  schedulerService.stop();
  closeRedisConnection();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', { reason: String(reason) });
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务...');
  schedulerService.stop();
  closeRedisConnection();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务...');
  schedulerService.stop();
  closeRedisConnection();
  process.exit(0);
});

startServer();
