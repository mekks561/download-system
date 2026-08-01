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
