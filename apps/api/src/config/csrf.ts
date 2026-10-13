import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';

const CSRF_SECRET = process.env.CSRF_SECRET || 'a-very-secure-random-secret';

export const {
  invalidCsrfTokenError, // This is a specific error constructor for CSRF failures
  generateToken, // Use this in your routes to generate a token for the client
  validateRequest, // This is the middleware that validates requests
  doubleCsrfProtection, // This is the combined middleware (cookie-parser + validation)
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
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
