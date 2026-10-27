import type { Prisma } from '@prisma/client';
import type { Download, Upload, File, Share, Schedule, ScheduleLog, Activity, User } from '@dm/shared';

export const serializeUser = (r: Prisma.UserGetPayload<Record<string, never>>): Omit<User, 'password'> => {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role,
    isActive: r.isActive,
    storageQuota: r.storageQuota.toString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
};

export const serializeDownload = (r: Prisma.DownloadGetPayload<Record<string, never>>): Download => {
  const { metadata } = r;
  let typedMetadata: Record<string, any> | undefined;
  if (metadata !== null && metadata !== undefined && typeof metadata === 'object' && !Array.isArray(metadata)) {
    typedMetadata = metadata as Record<string, any>;
  }
  return {
    id: r.id,
    userId: r.userId,
    url: r.url,
    filename: r.filename,
    status: r.status as Download['status'],
    progress: Number(r.progress),
    downloadedBytes: Number(r.downloadedBytes),
    totalBytes: Number(r.totalBytes),
    speed: Number(r.speed),
    resumePosition: Number(r.resumePosition),
    metadata: typedMetadata,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  };
};

export const serializeUpload = (r: Prisma.UploadGetPayload<Record<string, never>>): Upload => ({
  id: r.id,
  userId: r.userId,
  filename: r.filename,
  originalFilename: r.originalFilename,
  filePath: r.filePath,
  status: r.status as Upload['status'],
  progress: Number(r.progress),
  uploadedBytes: Number(r.uploadedBytes),
  totalBytes: Number(r.totalBytes),
  speed: Number(r.speed),
  createdAt: r.createdAt.toISOString(),
  completedAt: r.completedAt?.toISOString() ?? null,
});

export const serializeFile = (r: Prisma.FileGetPayload<Record<string, never>>): File => ({
  id: r.id,
  userId: r.userId,
  name: r.name,
  path: r.path,
  type: r.type,
  size: Number(r.size),
  isDirectory: r.isDirectory,
  parentId: r.parentId,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const serializeShare = (r: Prisma.ShareGetPayload<Record<string, never>>): Share => ({
  id: r.id,
  userId: r.userId,
  fileId: r.fileId,
  token: r.token,
  password: r.password,
  expiresAt: r.expiresAt?.toISOString() ?? null,
  downloadLimit: r.downloadLimit,
  downloadCount: r.downloadCount,
  status: r.status as Share['status'],
  createdAt: r.createdAt.toISOString(),
});

export const serializeSchedule = (r: Prisma.ScheduleGetPayload<Record<string, never>>): Schedule => ({
  id: r.id,
  userId: r.userId,
  url: r.url,
  filename: r.filename ?? undefined,
  cron: r.cron,
  type: r.type as Schedule['type'],
  isEnabled: r.isEnabled,
  lastRunAt: r.lastRunAt?.toISOString() ?? null,
  nextRunAt: r.nextRunAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export const serializeScheduleLog = (r: Prisma.ScheduleLogGetPayload<Record<string, never>>): ScheduleLog => ({
  id: r.id,
  scheduleId: r.scheduleId,
  status: r.status as ScheduleLog['status'],
  message: r.message,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
});

export const serializeActivity = (r: Prisma.ActivityGetPayload<Record<string, never>>): Activity => {
  const { metadata } = r;
  let typedMetadata: Record<string, unknown> | undefined;
  if (metadata !== null && metadata !== undefined && typeof metadata === 'object' && !Array.isArray(metadata)) {
    typedMetadata = metadata as Record<string, unknown>;
  }
  return {
    id: r.id,
    userId: r.userId,
    type: r.type,
    description: r.description,
    metadata: typedMetadata,
    createdAt: r.createdAt.toISOString(),
  };
};
