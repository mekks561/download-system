import { apiRequest } from '../lib/api';
import type { GmUserInfo } from '../store/useAuthStore';
import type { UserResponse, Download, Upload, UserRole, WorkerHeartbeat } from '@dm/shared';

/**
 * /api/gm/* 服务层。DTO 形状与 apps/api/src/services/gm.service.ts 对齐：
 * - 分页响应键是资源名（users/downloads），不是 items；
 * - uploads 为全量只读数组（无分页）。
 */

export function listWorkers(): Promise<WorkerHeartbeat[]> {
  return apiRequest<WorkerHeartbeat[]>('/gm/workers');
}

export interface GmLoginResult {
  token: string;
  gmUser: GmUserInfo;
}

export interface GmDashboardStats {
  userCount: number;
  downloadCount: number;
  uploadCount: number;
  fileCount: number;
  dailyDownloads: Array<{ date: string; downloads: number }>;
}

export interface GmUserListResult {
  users: UserResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export type GmDownloadRow = Download & { username: string; email: string };

export interface GmDownloadListResult {
  downloads: GmDownloadRow[];
  total: number;
  page: number;
  pageSize: number;
}

export type GmUploadRow = Upload & { username: string };

export interface GmUploadListResult {
  uploads: GmUploadRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GmActivityRow {
  id: number;
  userId: number;
  username: string;
  type: string;
  details: any;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface GmActivityListResult {
  activities: GmActivityRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GmPluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
}

export function login(username: string, password: string): Promise<GmLoginResult> {
  return apiRequest<GmLoginResult>('/gm/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export function getDashboard(): Promise<GmDashboardStats> {
  return apiRequest<GmDashboardStats>('/gm/dashboard');
}

export function listUsers(query: {
  search?: string;
  role?: UserRole;
  page?: number;
  pageSize?: number;
}): Promise<GmUserListResult> {
  return apiRequest<GmUserListResult>('/gm/users', { query: { ...query } });
}

export function updateUser(
  id: number,
  body: { role?: UserRole; isActive?: boolean; storageQuota?: number },
): Promise<{ user: UserResponse }> {
  return apiRequest<{ user: UserResponse }>(`/gm/users/${id}`, { method: 'PATCH', body });
}

export function resetUserPassword(id: number, newPassword: string): Promise<null> {
  return apiRequest<null>(`/gm/users/${id}/reset-password`, {
    method: 'POST',
    body: { newPassword },
  });
}

export function listDownloads(query: {
  userId?: number;
  page?: number;
  pageSize?: number;
}): Promise<GmDownloadListResult> {
  return apiRequest<GmDownloadListResult>('/gm/downloads', { query: { ...query } });
}

export function cancelDownload(id: number): Promise<{ download: Download }> {
  return apiRequest<{ download: Download }>(`/gm/downloads/${id}/cancel`, { method: 'POST' });
}

export function listUploads(query: {
  userId?: number;
  page?: number;
  pageSize?: number;
}): Promise<GmUploadListResult> {
  return apiRequest<GmUploadListResult>('/gm/uploads', { query: { ...query } });
}

export function deleteUpload(id: number): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/gm/uploads/${id}`, { method: 'DELETE' });
}

export function listActivities(query: {
  userId?: number;
  page?: number;
  pageSize?: number;
}): Promise<GmActivityListResult> {
  return apiRequest<GmActivityListResult>('/gm/activities', { query: { ...query } });
}

export interface GmAppSetting {
  key: string;
  value: any;
  updatedAt: string;
}

export interface GmStorageStats {
  totalBytes: string;
  downloadDir: string;
  uploadDir: string;
  pluginDir: string;
  dbSize: string;
  createdAt: string;
}

export interface GmTopUsageItem {
  name: string;
  size: string;
  type: 'file' | 'directory';
}

export interface GmStorageGovernanceResult {
  stats: GmStorageStats;
  topUsage: GmTopUsageItem[];
}

export interface GmCleanupPreviewResult {
  expiredShares: Array<{
    id: number;
    fileName: string;
    expiresAt: string;
    size: string;
  }>;
  zombieParts: Array<{
    name: string;
    size: string;
    mtime: string;
  }>;
}

export function listSettings(): Promise<GmAppSetting[]> {
  return apiRequest<GmAppSetting[]>('/gm/settings');
}

export function updateSetting(key: string, value: any): Promise<GmAppSetting> {
  return apiRequest<GmAppSetting>(`/gm/settings/${key}`, {
    method: 'PATCH',
    body: { value }, // Fix: apiRequest usually expects an object for body which it stringifies
  });
}

export function getStorageGovernance(): Promise<GmStorageGovernanceResult> {
  return apiRequest<GmStorageGovernanceResult>('/gm/storage/stats');
}

export function getCleanupPreview(days: number): Promise<GmCleanupPreviewResult> {
  return apiRequest<GmCleanupPreviewResult>('/gm/storage/cleanup/preview', { query: { days } });
}

export function triggerCleanup(days: number): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/gm/storage/cleanup', {
    method: 'POST',
    body: { days },
  });
}

// ---------------------------------------------------------------
// 插件管理
// ---------------------------------------------------------------

export function listPlugins(): Promise<GmPluginInfo[]> {
  return apiRequest<GmPluginInfo[]>('/gm/plugins');
}

export function togglePlugin(id: string, enabled: boolean): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/gm/plugins/${id}/toggle`, {
    method: 'POST',
    body: { enabled },
  });
}

export function uninstallPlugin(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/gm/plugins/${id}`, { method: 'DELETE' });
}

export function uploadPlugin(file: File): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('plugin', file);
  return apiRequest<{ id: string }>('/gm/plugins/upload', {
    method: 'POST',
    body: formData,
  });
}
