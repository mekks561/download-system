import type { Prisma } from '@prisma/client';
import type { Download, Upload, File, Share, Schedule, ScheduleLog, Activity, User } from '@dm/shared';

export const serializeUser = (r: Prisma.UserGetPayload<{}>): Omit<User, 'password'> => {
  const { password: _password, ...rest } = r;
  return {
    ...rest,
    role: r.role,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
};

export const serializeDownload = (r: Prisma.DownloadGetPayload<{}>): Download => ({
  ...r,
  status: r.status,
  progress: Number(r.progress),
  downloadedBytes: Number(r.downloadedBytes),
  totalBytes: Number(r.totalBytes),
  speed: Number(r.speed),
  resumePosition: Number(r.resumePosition),
  createdAt: r.createdAt.toISOString(),
  completedAt: r.completedAt?.toISOString() ?? null,
});

export const serializeUpload = (r: Prisma.UploadGetPayload<{}>): Upload => ({
  ...r,
  status: r.status,
  progress: Number(r.progress),
  uploadedBytes: Number(r.uploadedBytes),
  totalBytes: Number(r.totalBytes),
  speed: Number(r.speed),
  createdAt: r.createdAt.toISOString(),
  completedAt: r.completedAt?.toISOString() ?? null,
});

export const serializeFile = (r: Prisma.FileGetPayload<{}>): File => ({
  ...r,
  size: Number(r.size),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const serializeShare = (r: Prisma.ShareGetPayload<{}>): Share => ({
  ...r,
  status: r.status,
  createdAt: r.createdAt.toISOString(),
  expiresAt: r.expiresAt?.toISOString() ?? null,
});

export const serializeSchedule = (r: Prisma.ScheduleGetPayload<{}>): Schedule => ({
  ...r,
  type: r.type,
  lastRunAt: r.lastRunAt?.toISOString() ?? null,
  nextRunAt: r.nextRunAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export const serializeScheduleLog = (r: Prisma.ScheduleLogGetPayload<{}>): ScheduleLog => ({
  ...r,
  status: r.status,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
});

export const serializeActivity = (r: Prisma.ActivityGetPayload<{}>): Activity => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
});
