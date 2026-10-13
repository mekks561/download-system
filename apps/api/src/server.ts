import 'dotenv/config';
import path from 'node:path';
import { createServer } from 'node:http';
import { app } from './app';
import { getGmJwtSecret } from './middleware/gm-auth';
import { recoverInterrupted } from './services/download-engine.service';
import { initSocket } from './config/socket';
import { initScheduler } from './services/schedule-executor.service';
import { initPluginHost } from './config/plugin-host';
import { broadcastDiskUsage } from './services/resource.service';

// fail-fast：生产环境缺独立 GM_JWT_SECRET 时直接拒绝启动（开发环境允许临时密钥并告警）。
// 放到监听端口前，避免「服务已起、GM 登录一律失败」的带病运行。
getGmJwtSecret();

const server = createServer(app);
initSocket(server);

// S4 插件系统：启动时可选装载本地插件（installed.json 缺失/目录缺失时为空注册表）。
void initPluginHost();

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // 下载引擎的运行态在进程内存里，重启后已全部丢失：
  // 把上一轮残留的「下载中」记录回落成 paused，避免出现永远卡住的幽灵任务。
  void recoverInterrupted();
  // 初始化定时任务调度器
  void initScheduler();

  // 定时推送磁盘空间信息
  setInterval(() => {
    void broadcastDiskUsage();
  }, 10000); // 10秒推一次
});

export { app, server };
