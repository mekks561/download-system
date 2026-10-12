import { z } from 'zod';
import { OnboardingStep3Schema } from './onboarding';

/**
 * 服务端目录浏览与下载设置的共享契约（前端目录选择器 ↔ 后端）。
 *
 * 为什么需要它：
 * 浏览器里不存在任何能调起「系统目录选择框」并拿到**服务端**路径的能力，而下载管理器
 * 是部署在服务器/NAS 上的服务，下载目录必然是服务端路径。因此 Web 形态下唯一可用的
 * 选择方式就是「列出服务端目录、由用户逐层点进去」。
 *
 * 安全边界（与 services/storage.service.ts 的实现约定一致）：
 * - 所有路径都是**服务端**绝对路径，浏览范围被限制在 `DM_DOWNLOAD_ROOT` 之内，
 *   接口不返回根目录之外的任何信息，也不列文件（只列目录）。
 * - `root` 字段随响应回传，使前端能画出「回到根目录」的边界锚点。
 */

/** 子目录条目（只暴露名称与绝对路径，不含大小/时间等元信息） */
export const StorageDirEntrySchema = z.object({
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(4096),
});
export type StorageDirEntry = z.infer<typeof StorageDirEntrySchema>;

/**
 * `GET /api/fs/dirs` 的响应 data。
 *
 * `parent` 为 null 表示「已在可浏览根目录」，前端据此禁用「上一级」；
 * `writable` 是服务端对当前目录的真实 `fs.access(W_OK)` 结果——向导里
 * 「目录无写权限 → 提示不可写」这条校验由服务端完成，前端不猜。
 */
export const StorageListingSchema = z.object({
  root: z.string().min(1).max(4096),
  path: z.string().min(1).max(4096),
  parent: z.string().min(1).max(4096).nullable(),
  writable: z.boolean(),
  directories: z.array(StorageDirEntrySchema),
  /** 子目录超过服务端上限被截断（前端据此提示「仅显示前 N 个」） */
  truncated: z.boolean(),
});
export type StorageListing = z.infer<typeof StorageListingSchema>;

/** `GET /api/fs/dirs` 的查询参数（绝对路径或相对根目录的路径；缺省为根目录） */
export const StorageBrowseQuerySchema = z.object({
  path: z.string().max(4096).optional(),
});
export type StorageBrowseQuery = z.infer<typeof StorageBrowseQuerySchema>;

/**
 * `PUT /api/settings/download` 的请求体：与向导 Step 3 **同一份** schema。
 *
 * 复用而非复制，避免「向导里能填的值在设置页被拒」这类两处漂移。
 */
export const DownloadSettingsUpdateSchema = OnboardingStep3Schema;
export type DownloadSettingsUpdate = z.infer<typeof DownloadSettingsUpdateSchema>;

/**
 * `GET /api/settings/download` 的响应 data。
 *
 * `configured` 区分「用户真的配过」与「返回的是默认值」——未配置时
 * `downloadDir` 为空串，前端据此提示去设置，而不是把默认值当成用户选择。
 */
export const DownloadSettingsSchema = z.object({
  downloadDir: z.string().max(4096),
  maxConcurrent: z.number().int().min(1).max(10),
  speedLimitKBps: z.number().int().min(0),
  configured: z.boolean(),
});
export type DownloadSettings = z.infer<typeof DownloadSettingsSchema>;
