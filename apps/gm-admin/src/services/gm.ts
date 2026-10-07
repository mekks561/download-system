import { apiRequest } from '../lib/api';
import type { GmUserInfo } from '../store/useAuthStore';
import type { UserResponse, Download, Upload, UserRole } from '@dm/shared';

/**
 * /api/gm/* 服务层。DTO 形状与 apps/api/src/services/gm.service.ts 对齐：
 * - 分页响应键是资源名（users/downloads），不是 items；
 * - uploads 为全量只读数组（无分页）。
 */

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
  body: { role?: UserRole; isActive?: boolean },
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

export function listUploads(): Promise<GmUploadRow[]> {
  return apiRequest<GmUploadRow[]>('/gm/uploads');
}
