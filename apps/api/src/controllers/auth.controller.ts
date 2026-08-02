import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/auth.service';

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await service.register(req.body);
  res.status(201).json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: user, timestamp: new Date().toISOString() }));
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.login(req.body);
  res.json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});
