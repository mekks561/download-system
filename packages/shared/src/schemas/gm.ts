import { z } from 'zod';
import { UserRole } from '../enums.js';

/**
 * S3 Task 4（B-lite）GM 管理后台契约层。
 *
 * GM 账号独立于主站 users（见 Prisma GmUser / gm_users 表），
 * 以下 DTO 仅用于 /api/gm/* 路由；登录走独立 GM JWT（GM_JWT_SECRET）。
 * 全部按 zod v4 API 编写（z.coerce / .strict()）。
 */

/** GM 登录：独立 gm_users 账号，username 而非 email */
export const GmLoginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50),
  password: z.string().min(1, '密码不能为空').max(128),
});
export type GmLogin = z.infer<typeof GmLoginSchema>;

/** GM 重置任意主站用户密码 */
export const GmResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, '新密码至少 8 个字符')
    .max(128, '新密码最多 128 个字符'),
});
export type GmResetPassword = z.infer<typeof GmResetPasswordSchema>;

/** 分页公共段：query string 全是字符串，用 coerce 归一；pageSize 硬上限 100 防拖库 */
const pageField = z.coerce.number().int().min(1).default(1);
const pageSizeField = z.coerce.number().int().min(1).max(100).default(20);
/** query 里空串等价于"未传"（?search=&userId= 不应 400） */
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);
const optionalSearch = z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional());
const optionalUserId = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().optional(),
);

/** 用户管理列表：搜索 + 角色过滤 + 分页 */
export const GmUserQuerySchema = z
  .object({
    search: optionalSearch,
    role: UserRole.optional(),
    page: pageField,
    pageSize: pageSizeField,
  })
  .strict();
export type GmUserQuery = z.infer<typeof GmUserQuerySchema>;

/** 用户更新白名单：只允许 role/isActive/storageQuota（防 mass assignment 改写 password/id 等） */
export const GmUserUpdateSchema = z
  .object({
    role: UserRole.optional(),
    isActive: z.boolean().optional(),
    storageQuota: z.coerce.string().optional(),
  })
  .strict();
export type GmUserUpdate = z.infer<typeof GmUserUpdateSchema>;

/** 下载审计列表：可选按主站 userId 过滤 + 分页 */
export const GmDownloadQuerySchema = z
  .object({
    userId: optionalUserId,
    page: pageField,
    pageSize: pageSizeField,
  })
  .strict();
export type GmDownloadQuery = z.infer<typeof GmDownloadQuerySchema>;

/** 上传审计列表：可选按主站 userId 过滤 + 分页 */
export const GmUploadQuerySchema = z
  .object({
    userId: optionalUserId,
    page: pageField,
    pageSize: pageSizeField,
  })
  .strict();
export type GmUploadQuery = z.infer<typeof GmUploadQuerySchema>;

/** 活动审计列表：可选按主站 userId 过滤 + 分页 */
export const GmActivityQuerySchema = z
  .object({
    userId: optionalUserId,
    page: pageField,
    pageSize: pageSizeField,
  })
  .strict();
export type GmActivityQuery = z.infer<typeof GmActivityQuerySchema>;

/**
 * Task 1: 插件管理中心契约。
 */

/** 插件响应信息 */
export const GmPluginResponseSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  state: z.enum(['installed', 'activated', 'deactivated', 'error', 'uninstalled']),
  enabled: z.boolean(),
  lastError: z.string().nullable(),
  permissions: z.array(z.string()).optional(),
  securityAudit: z.object({
    riskLevel: z.enum(['low', 'medium', 'high']),
    score: z.number(),
    summary: z.string(),
    findings: z.array(z.object({
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string(),
      file: z.string().optional(),
      recommendation: z.string()
    }))
  }).optional(),
});
export type GmPluginResponse = z.infer<typeof GmPluginResponseSchema>;

/** 启用/禁用插件操作 */
export const GmPluginToggleSchema = z.object({
  enabled: z.boolean(),
});
export type GmPluginToggle = z.infer<typeof GmPluginToggleSchema>;

/**
 * Task 3: 资源治理（存储概览与清理）契约。
 */

/** 存储统计信息响应 */
export const GmStorageStatsSchema = z.object({
  totalBytes: z.string(),
  downloadDir: z.string(),
  uploadDir: z.string(),
  pluginDir: z.string(),
  dbSize: z.string(),
  createdAt: z.string(),
});
export type GmStorageStats = z.infer<typeof GmStorageStatsSchema>;

/** 清理资源请求 */
export const GmStorageCleanupSchema = z.object({
  days: z.coerce.number().int().min(0).default(7),
});
export type GmStorageCleanup = z.infer<typeof GmStorageCleanupSchema>;

/**
 * Task 2: 跨地域调度治理 (GeoPolicy) 契约。
 */

/** GeoPolicy 创建/更新 */
export const GmGeoPolicySchema = z.object({
  pattern: z.string().min(1, '匹配模式不能为空').max(255),
  region: z.string().min(1, '地域不能为空').max(100),
  priority: z.coerce.number().int().default(0),
  isHardLimit: z.boolean().default(false),
  description: z.string().max(1000).optional().nullable(),
});
export type GmGeoPolicyInput = z.infer<typeof GmGeoPolicySchema>;

/** GeoPolicy 响应 */
export const GmGeoPolicyResponseSchema = GmGeoPolicySchema.extend({
  id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GmGeoPolicy = z.infer<typeof GmGeoPolicyResponseSchema>;
