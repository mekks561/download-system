import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema, type OnboardingStep2Input } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import * as service from '../services/setup.service';

const envelope = (data: unknown) =>
  ApiSuccessSchema(z.unknown()).parse({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });

/**
 * POST /api/auth/setup —— 首次运行创建管理员
 *
 * 仅当 users 表为空时可用（service 内以事务保证），否则 409 CONFLICT。
 * 返回 201 + { token, user }：与 /register 一致（均创建了新资源），前端可直接登入。
 */
export const setup = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.setupAdmin(req.body as OnboardingStep2Input);
  res.status(201).json(envelope(result));
});

/** GET /api/auth/setup-status —— 前端判定是否进入向导（公开、只读） */
export const getSetupStatus = asyncHandler(async (_req: Request, res: Response) => {
  const result = await service.getSetupStatus();
  res.json(envelope(result));
});

/**
 * POST /api/auth/skip-setup —— 跳过向导，创建默认管理员
 *
 * 同样受「仅首次可用」约束；密码随机生成，明文仅在本响应中出现一次。
 */
export const skipSetup = asyncHandler(async (_req: Request, res: Response) => {
  const result = await service.skipSetup();
  res.status(201).json(envelope(result));
});
