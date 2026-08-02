import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema, type UserCreate, type Login, type UserUpdate, type ChangePassword } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/auth.service';

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.register(req.body as UserCreate);
  res.status(201).json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.login(req.body as Login);
  res.json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.getProfile(req.userId!);
  res.json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.updateProfile(req.userId!, req.body as UserUpdate);
  res.json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.changePassword(req.userId!, req.body as ChangePassword);
  res.json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});

export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.deleteAccount(req.userId!, (req.body as { password: string }).password);
  res.json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});

export const logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await service.logout();
  res.json(ApiSuccessSchema(z.unknown()).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});
