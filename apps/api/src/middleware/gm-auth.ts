import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

/**
 * GM 后台独立认证（S3 Task 4 B-lite）。
 *
 * 与主站 middleware/auth.ts 的隔离边界：
 * - 独立密钥 GM_JWT_SECRET（绝不复用 JWT_SECRET）：主站用户 token 验签必失败，反之亦然；
 * - 独立账号表 gm_users，载荷形态 { id, username, role }（主站为 { id, role }）；
 * - 有效期 8h（后台会话），主站 1h。
 *
 * 密钥策略比主站更严格：production 缺密钥直接抛错阻止启动；
 * 非 production 允许使用显式标记的 dev 临时值并只 warn 一次。
 */

const DEV_FALLBACK_SECRET = 'dev-only-gm-jwt-secret-CHANGE-ME-do-not-use-in-prod';
let fallbackWarned = false;

export function getGmJwtSecret(): string {
  const fromEnv = process.env.GM_JWT_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('GM_JWT_SECRET 未设置：生产环境必须配置独立的 GM JWT 密钥');
  }
  if (!fallbackWarned) {
    console.warn(
      '[gm-auth] 警告：GM_JWT_SECRET 未设置，正在使用仅适用于本地开发的临时密钥。生产环境启动将被拒绝。',
    );
    fallbackWarned = true;
  }
  return DEV_FALLBACK_SECRET;
}

export interface GmPrincipal {
  id: number;
  username: string;
  role: string;
}

export interface GmAuthRequest extends Request {
  gmUser?: GmPrincipal;
}

/** 签发 GM JWT（8h） */
export function signGmToken(gmUser: GmPrincipal): string {
  return jwt.sign(
    { id: gmUser.id, username: gmUser.username, role: gmUser.role },
    getGmJwtSecret(),
    { expiresIn: '8h' },
  );
}

/** 校验 Bearer GM JWT，成功挂 req.gmUser；任何失败统一 401（不区分原因） */
export function requireGmAuth(req: GmAuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 401, '缺少 GM 认证令牌'));
  }
  try {
    const payload = jwt.verify(header.slice(7), getGmJwtSecret()) as unknown;
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as GmPrincipal).username !== 'string' ||
      typeof (payload as GmPrincipal).id !== 'number'
    ) {
      return next(new AppError('UNAUTHORIZED', 401, 'GM 认证令牌无效'));
    }
    const p = payload as GmPrincipal;
    req.gmUser = { id: p.id, username: p.username, role: String(p.role ?? 'admin') };
    next();
  } catch {
    next(new AppError('UNAUTHORIZED', 401, 'GM 认证令牌无效'));
  }
}
