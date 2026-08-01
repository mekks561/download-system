import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符'),
});

export const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符').regex(/[A-Z]/, '密码必须包含大写字母').regex(/[0-9]/, '密码必须包含数字'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码输入不一致',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, '密码至少6个字符'),
  newPassword: z.string().min(6, '新密码至少6个字符').regex(/[A-Z]/, '密码必须包含大写字母').regex(/[0-9]/, '密码必须包含数字'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次密码输入不一致',
  path: ['confirmPassword'],
});

export const profileSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().refine(
    (val) => val === '' || /^1[3-9]\d{9}$/.test(val),
    { message: '请输入有效的手机号码' }
  ).optional().nullable(),
});

export const downloadSchema = z.object({
  url: z.string().url('请输入有效的URL地址'),
  filename: z.string().min(1, '请输入文件名').optional(),
  category: z.string().optional(),
});

export const settingsSchema = z.object({
  maxConcurrent: z.number().min(1).max(10),
  maxRetries: z.number().min(0).max(5),
  defaultPath: z.string().min(1, '请输入下载路径'),
  autoStart: z.boolean(),
  notifications: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type DownloadFormData = z.infer<typeof downloadSchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
