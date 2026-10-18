import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response, NextFunction } from 'express';

const CSRF_SECRET = process.env.CSRF_SECRET || 'a-very-secure-random-secret';

export const {
  invalidCsrfTokenError, // This is a specific error constructor for CSRF failures
  generateCsrfToken, // Use this in your routes to generate a token for the client
  validateRequest, // This is the middleware that validates requests
  doubleCsrfProtection, // This is the combined middleware (cookie-parser + validation)
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  // csrf-csrf v4 起 token 必须绑定「会话标识」——签名消息里会带上它，生成与校验必须一致。
  // 本项目前端与 API 同源（都走 nginx 的 /api 反代）、无服务端会话，故用固定标识，
  // 保持与 v3 时代相同的「HMAC + Cookie/Header 双提交」语义。
  getSessionIdentifier: () => 'dm-csrf',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // 站点当前以纯 HTTP 暴露（http://<host>:3005 主站 / :3006 GM 后台）：
    // Secure Cookie 不会被浏览器保存，双提交必然失败。
    // 仅在真正启用 HTTPS 后，通过环境变量 COOKIE_SECURE=true 打开。
    secure: process.env.COOKIE_SECURE === 'true',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'],
});

/**
 * 包装中间件以兼容 Express 错误处理
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  doubleCsrfProtection(req, res, (err: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { code: 'CSRF_ERROR', message: 'CSRF 校验失败' },
        timestamp: new Date().toISOString(),
      });
    }
    next();
  });
};
