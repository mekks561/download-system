import { z } from 'zod';
import { DownloadStatus } from '../enums';

export const DownloadSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255),
  status: DownloadStatus,
  progress: z.number().min(0).max(100),
  downloadedBytes: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
  resumePosition: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type Download = z.infer<typeof DownloadSchema>;

export const DownloadCreateSchema = z.object({
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255).optional(),
});
export type DownloadCreate = z.infer<typeof DownloadCreateSchema>;

// 更新白名单：仅允许状态与进度，禁止改写 userId/url 等字段
export const DownloadUpdateSchema = z.object({
  status: DownloadStatus.optional(),
  progress: z.number().min(0).max(100).optional(),
});
export type DownloadUpdate = z.infer<typeof DownloadUpdateSchema>;
