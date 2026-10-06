import rateLimit from 'express-rate-limit';

/**
 * 认证类端点共享限流器（S3 Task 4 起主站 /api/auth/* 与 GM /api/gm/auth/login 复用）。
 * 10 次/15 分钟/IP：防登录暴力破解、注册刷号、初始化探测。
 *
 * 注意：express-rate-limit 计数为单实例内存态，多实例部署需换共享 store。
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: '尝试次数过多，请 15 分钟后再试' },
    timestamp: new Date().toISOString(),
  },
});
