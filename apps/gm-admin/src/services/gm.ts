import { apiRequest } from '../lib/api';
import type { GmUserInfo } from '../store/useAuthStore';
import type { UserResponse, Download, Upload, UserRole, WorkerHeartbeat, GmGeoPolicy, GmGeoPolicyInput } from '@dm/shared';

/**
 * /api/gm/* 服务层。DTO 形状与 apps/api/src/services/gm.service.ts 对齐：
 * - 分页响应键是资源名（users/downloads），不是 items；
 * - uploads 为全量只读数组（无分页）。
 */

/** 系统日志条目（与 api task-observer 内存缓冲及 socket systemLog 事件同形） */
export interface GmSystemLog {
  taskId?: string | number;
  workerId: string;
  level: string;
  message: string;
  timestamp: string;
}

export function listWorkers(): Promise<WorkerHeartbeat[]> {
  return apiRequest<WorkerHeartbeat[]>('/gm/workers');
}

export function getSystemLogs(): Promise<GmSystemLog[]> {
  return apiRequest<GmSystemLog[]>('/gm/logs');
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
  users: (UserResponse & { currentUsage: string; downloadCount: number })[];
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
  details: unknown;
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

export type GmAuditRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GmPluginSecurityAudit {
  score: number;
  riskLevel: GmAuditRiskLevel;
  summary?: string;
  findings: Array<{
    severity: GmAuditRiskLevel;
    file?: string;
    description: string;
    recommendation?: string;
  }>;
}

export interface GmPluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  securityAudit?: GmPluginSecurityAudit;
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
  body: { role?: UserRole; isActive?: boolean; storageQuota?: string },
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
  value: unknown;
  updatedAt: string;
}

/** download.config 设置的值形状（与 shared DownloadSettings 对齐） */
export interface GmDownloadConfig {
  speedLimitKBps: number;
  sensitiveKeywords: string[];
  autoCleanupDays: number;
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

export interface GmGovernanceInsight {
  type: 'warning' | 'optimization' | 'cleanup';
  title: string;
  description: string;
  action?: string;
  /** geo-insights 附带：可采纳为调度策略的模式与目标地域 */
  data?: {
    pattern?: string;
    region?: string;
  };
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

export function updateSetting(key: string, value: unknown): Promise<GmAppSetting> {
  return apiRequest<GmAppSetting>(`/gm/settings/${key}`, {
    method: 'PATCH',
    body: { value }, // Fix: apiRequest usually expects an object for body which it stringifies
  });
}

export function getStorageGovernance(): Promise<GmStorageGovernanceResult> {
  return apiRequest<GmStorageGovernanceResult>('/gm/storage/stats');
}

export function getStorageByCategory(): Promise<Array<{ name: string; value: string }>> {
  return apiRequest<Array<{ name: string; value: string }>>('/gm/storage/category-stats');
}

/** 存储趋势点（api gm.service.getStorageTrends，单位 MB） */
export interface GmStorageTrend {
  date: string;
  time: string;
  total: number;
  downloads: number;
  uploads: number;
}

export function getStorageTrends(): Promise<GmStorageTrend[]> {
  return apiRequest<GmStorageTrend[]>('/gm/storage/trends');
}

export function getAiGovernanceInsights(): Promise<GmGovernanceInsight[]> {
  return apiRequest<GmGovernanceInsight[]>('/gm/storage/ai-insights');
}

/** 语义去重分组（api resource.service.detectDuplicates） */
export interface GmDuplicateGroup {
  original: {
    id: number;
    filename: string;
    size: string;
    userId: number;
    createdAt: string;
  };
  matches: Array<{
    id: number;
    filename: string;
    score: number;
    userId: number;
    /** API 当前未返回，前端需兜底显示 */
    createdAt?: string;
  }>;
}

export function getDuplicates(): Promise<GmDuplicateGroup[]> {
  return apiRequest<GmDuplicateGroup[]>('/gm/storage/duplicates');
}

/** 智能归档建议（api ai.service.ArchivingSuggestion） */
export interface GmArchivingSuggestion {
  taskId: number;
  filename: string;
  action: 'compress' | 'delete' | 'move_to_archive' | 'keep';
  reason: string;
  expectedSaving: string;
}

export function getArchivingSuggestions(): Promise<GmArchivingSuggestion[]> {
  return apiRequest<GmArchivingSuggestion[]>('/gm/storage/archiving/suggestions');
}

export function applyArchivingAction(taskId: number, action: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/gm/storage/archiving/apply', {
    method: 'POST',
    body: { taskId, action }
  });
}

export function restoreArchivingAction(taskId: number): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/gm/storage/archiving/restore', {
    method: 'POST',
    body: { taskId }
  });
}

/** 用户行为画像与配额建议（api resource.service.getUserBehaviorProfile） */
export interface GmUserProfile {
  userId: number;
  username: string;
  currentQuota: string;
  currentUsage: string;
  usagePercent: number;
  topCategory: string;
  recentGrowth: string;
  recommendation: string;
  reason: string;
}

export function getUserProfiles(): Promise<GmUserProfile[]> {
  return apiRequest<GmUserProfile[]>('/gm/storage/user-profiles');
}

/** 小时级流量点（api gm.service.getHourlyTrafficStats） */
export interface GmTrafficPoint {
  time: string;
  count: number;
  size: string;
}

export function getTrafficStats(): Promise<GmTrafficPoint[]> {
  return apiRequest<GmTrafficPoint[]>('/gm/traffic/stats');
}

export interface GmTrafficForecastPoint {
  time: string;
  predictedCount: number;
  predictedSize: string;
  isPeak: boolean;
}

/** AI 流量预测（api ai.service.forecastTraffic，AI 不可用时为 null） */
export interface GmTrafficForecast {
  forecast: GmTrafficForecastPoint[];
  recommendation: {
    action: 'scale_up' | 'scale_down' | 'stay';
    targetWorkerCount: number;
    reason: string;
  };
}

export function getTrafficForecast(): Promise<GmTrafficForecast | null> {
  return apiRequest<GmTrafficForecast | null>('/gm/traffic/forecast');
}

/** 地域流量分布（api gm.service.getGeoTrafficStats，value 为字节数字符串） */
export interface GmGeoTrafficStat {
  name: string;
  count: number;
  value: string;
}

export function getGeoTrafficStats(): Promise<GmGeoTrafficStat[]> {
  return apiRequest<GmGeoTrafficStat[]>('/gm/traffic/geo-stats');
}

export function getGeoSchedulingInsights(): Promise<GmGovernanceInsight[]> {
  return apiRequest<GmGovernanceInsight[]>('/gm/storage/geo-insights');
}

/** 自治操作日志（api auto-scaler 写入 Redis autonomous:logs） */
export interface GmAutonomousLog {
  timestamp: string;
  type: string;
  message: string;
  module: string;
}

export function getAutonomousLogs(): Promise<GmAutonomousLog[]> {
  return apiRequest<GmAutonomousLog[]>('/gm/autonomous/logs');
}

export function getAutoScalerStatus(): Promise<{ enabled: boolean }> {
  return apiRequest<{ enabled: boolean }>('/gm/autonomous/status');
}

export function toggleAutoScaler(enabled: boolean): Promise<{ enabled: boolean }> {
  return apiRequest<{ enabled: boolean }>('/gm/autonomous/toggle', {
    method: 'POST',
    body: { enabled }
  });
}

export function applyAiGovernanceAction(action: string): Promise<{ success: boolean; affected: number }> {
  return apiRequest<{ success: boolean; affected: number }>('/gm/storage/ai-action', {
    method: 'POST',
    body: { action },
  });
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
// 调度策略 (GeoPolicy)
// ---------------------------------------------------------------

export function listGeoPolicies(): Promise<GmGeoPolicy[]> {
  return apiRequest<GmGeoPolicy[]>('/gm/storage/geo-policies');
}

export function createGeoPolicy(body: GmGeoPolicyInput): Promise<GmGeoPolicy> {
  return apiRequest<GmGeoPolicy>('/gm/storage/geo-policies', {
    method: 'POST',
    body,
  });
}

export function updateGeoPolicy(id: number, body: GmGeoPolicyInput): Promise<GmGeoPolicy> {
  return apiRequest<GmGeoPolicy>(`/gm/storage/geo-policies/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteGeoPolicy(id: number): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/gm/storage/geo-policies/${id}`, {
    method: 'DELETE',
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
