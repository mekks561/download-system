/**
 * PM2 进程配置（v3.1.0 起）
 *
 * 变更说明：
 * - api 进程改为直接运行 TypeScript 入口：node --import tsx src/server.ts
 *   v2 时代此处指向 ./src/server.js（编译产物），v3 起后端由 tsx 直跑 TS，
 *   该 .js 产物不再产生，原配置会导致 PM2 启动即失败。
 * - 原 'download-manager-scheduler' 进程已移除：v3 不存在该入口
 *   （./src/services/scheduler.js 从未存在，无 cron 依赖、无调度执行器）。
 *   注意：调度记录目前只有 CRUD（schedule.service.ts），尚无可执行的调度运行时。
 */
module.exports = {
  apps: [
    {
      name: 'download-manager-api',
      script: './src/server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      // 必须用 fork：cluster 模式下 PM2 注入的 cluster 引导与 `--import tsx` 冲突
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 4000
    }
  ]
};
