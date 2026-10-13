import { z } from 'zod';
import { DownloadStatus } from '../enums';

const DownloadUrlSchema = z.string().min(1).max(50000); // 增大长度限制以支持 base64 种子

export const DownloadSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  url: DownloadUrlSchema,
  filename: z.string().min(1).max(255),
  status: DownloadStatus,
  progress: z.number().min(0).max(100),
  downloadedBytes: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
  resumePosition: z.number().int().nonnegative(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type Download = z.infer<typeof DownloadSchema>;

export const DownloadCreateSchema = z.object({
  url: DownloadUrlSchema,
  filename: z.string().min(1).max(255).optional(),
  metadata: z.record(z.any()).optional(),
});
export type DownloadCreate = z.infer<typeof DownloadCreateSchema>;

/** BT/磁力链接元数据解析请求 */
export const DownloadParseSchema = z.object({
  url: z.string().optional(),
  file: z.string().optional(),
});
export type DownloadParse = z.infer<typeof DownloadParseSchema>;

// 更新白名单：仅允许状态与进度，禁止改写 userId/url 等字段
export const DownloadUpdateSchema = z.object({
  status: DownloadStatus.optional(),
  progress: z.number().min(0).max(100).optional(),
});
export type DownloadUpdate = z.infer<typeof DownloadUpdateSchema>;
