import { z } from 'zod';
import { ScheduleType, ScheduleLogStatus } from '../enums';

export const ScheduleSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255).optional(),
  cron: z.string().min(1).max(100),
  type: ScheduleType,
  isEnabled: z.boolean(),
  lastRunAt: z.string().datetime().nullable(),
  nextRunAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const ScheduleCreateSchema = z.object({
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255).optional(),
  cron: z.string().min(1).max(100),
  type: ScheduleType,
});
export type ScheduleCreate = z.infer<typeof ScheduleCreateSchema>;

// 更新白名单：仅允许修改启用状态与 cron 表达式，禁止改写 userId/url 等敏感字段
export const ScheduleUpdateSchema = z.object({
  isEnabled: z.boolean().optional(),
  cron: z.string().min(1).max(100).optional(),
});
export type ScheduleUpdate = z.infer<typeof ScheduleUpdateSchema>;

export const ScheduleLogSchema = z.object({
  id: z.number().int().positive(),
  scheduleId: z.number().int().positive(),
  status: ScheduleLogStatus,
  message: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
});
export type ScheduleLog = z.infer<typeof ScheduleLogSchema>;
