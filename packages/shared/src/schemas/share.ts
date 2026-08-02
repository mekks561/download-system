import { z } from 'zod';
import { ShareStatus } from '../enums';

export const ShareSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  fileId: z.number().int().positive(),
  token: z.string().min(1),
  password: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  downloadLimit: z.number().int().nonnegative().nullable(),
  downloadCount: z.number().int().nonnegative(),
  status: ShareStatus,
  createdAt: z.string().datetime(),
});
export type Share = z.infer<typeof ShareSchema>;

export const ShareCreateSchema = z.object({
  fileId: z.number().int().positive(),
  password: z.string().min(4).max(128).optional(),
  expiresAt: z.string().datetime().optional(),
  downloadLimit: z.number().int().positive().optional(),
});
export type ShareCreate = z.infer<typeof ShareCreateSchema>;

// 更新白名单：仅允许修改状态，禁止改写 userId/fileId/token 等敏感字段
export const ShareUpdateSchema = z.object({
  status: ShareStatus,
});
export type ShareUpdate = z.infer<typeof ShareUpdateSchema>;
