import { z } from 'zod';

export const DownloadStatus = z.enum([
  'pending', 'downloading', 'paused', 'completed', 'error', 'cancelled',
]);
export type DownloadStatus = z.infer<typeof DownloadStatus>;

export const UploadStatus = z.enum([
  'pending', 'uploading', 'completed', 'error', 'cancelled',
]);
export type UploadStatus = z.infer<typeof UploadStatus>;

export const UserRole = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof UserRole>;

export const ScheduleType = z.enum(['once', 'daily', 'weekly', 'monthly']);
export type ScheduleType = z.infer<typeof ScheduleType>;

export const ShareStatus = z.enum(['active', 'disabled', 'expired']);
export type ShareStatus = z.infer<typeof ShareStatus>;

export const ScheduleLogStatus = z.enum(['running', 'success', 'failed']);
export type ScheduleLogStatus = z.infer<typeof ScheduleLogStatus>;
