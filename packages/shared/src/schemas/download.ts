import { z } from 'zod';
import { DownloadStatus } from '../enums.js';

/**
 * 下载地址：支持 http/https/ftp、磁力链接与 base64 .torrent 种子。
 * 长度放宽到 50000 是为了容纳 base64 种子，但格式仍必须可识别，
 * 否则任意字符串都能进队列，worker 侧只能失败告终。
 */
const DownloadUrlSchema = z
  .string()
  .min(1)
  .max(50000)
  .refine((value) => {
    const url = value.trim();
    if (/^magnet:\?/i.test(url)) return /xt=urn:btih:/i.test(url);
    if (/^data:application\/x-bittorrent;base64,/i.test(url)) {
      return url.length > 'data:application/x-bittorrent;base64,'.length;
    }
    if (/^(https?|ftp):\/\//i.test(url)) {
      // shared 包没有 DOM lib，不能用 URL 构造器；这里只校验「协议 + 非空主机」
      return /^(https?|ftp):\/\/[^\s/?#]+/i.test(url);
    }
    return false;
  }, '只支持 http/https/ftp 地址、磁力链接或 .torrent 种子');

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
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type Download = z.infer<typeof DownloadSchema>;

export const DownloadCreateSchema = z.object({
  url: DownloadUrlSchema,
  filename: z.string().min(1).max(255).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type DownloadCreate = z.infer<typeof DownloadCreateSchema>;

/** BT/磁力链接元数据解析请求 */
export const DownloadParseSchema = z.object({
  url: z.string().optional(),
  file: z.string().optional(),
});
export type DownloadParse = z.infer<typeof DownloadParseSchema>;

// 更新白名单：允许状态、进度及元数据，禁止改写 userId/url 等字段
export const DownloadUpdateSchema = z.object({
  status: DownloadStatus.optional(),
  progress: z.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type DownloadUpdate = z.infer<typeof DownloadUpdateSchema>;
