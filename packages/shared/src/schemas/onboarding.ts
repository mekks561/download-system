import { z } from 'zod';

/**
 * S1 桌面 Onboarding 契约层（单一真相源）
 *
 * 前端向导表单校验与后端 `POST /auth/setup` 共用同一 schema，
 * 避免「前端放行、后端 400」或反过来的契约错配。
 */

/** Step 2：创建管理员账号 */
export const OnboardingStep2Schema = z.object({
  username: z
    .string()
    .min(3, { message: '用户名至少 3 个字符' })
    .max(20, { message: '用户名最多 20 个字符' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' }),
  email: z.string().email({ message: '请输入合法的邮箱地址' }),
  password: z
    .string()
    .min(8, { message: '密码至少 8 个字符' })
    .max(128, { message: '密码最多 128 个字符' }),
});
export type OnboardingStep2Input = z.infer<typeof OnboardingStep2Schema>;

/**
 * Step 3：下载目录与并发配置
 *
 * maxConcurrent / speedLimitKBps 用 `z.coerce.number()`：表单里这两个值是字符串，
 * 直接交给 schema 也能归一化成数字，前端无需自己转。
 */
export const OnboardingStep3Schema = z.object({
  downloadDir: z.string().min(1, { message: '请选择下载目录' }),
  maxConcurrent: z.coerce.number().int().min(1).max(10).default(5),
  speedLimitKBps: z.coerce.number().int().min(0).default(0),
});
export type OnboardingStep3Input = z.infer<typeof OnboardingStep3Schema>;

/**
 * 首次运行状态：`GET /auth/setup-status` 的响应契约。
 *
 * 只暴露布尔值而非用户数量——前端只需要知道「要不要走向导」，
 * 用户数属于不该公开的信息。
 */
export const OnboardingStatusSchema = z.object({
  needsSetup: z.boolean(),
});
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;
