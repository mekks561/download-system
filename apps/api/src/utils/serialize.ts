import type { Prisma } from '@prisma/client';
import type { Download, Upload, File, Share, Schedule, ScheduleLog, Activity, User } from '@dm/shared';

export const serializeUser = (r: Prisma.UserGetPayload<Record<string, never>>): Omit<User, 'password'> => {
  const { password: _password, ...rest } = r;
  return {
    ...rest,
    role: r.role,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
};

export const serializeDownload = (r: Prisma.DownloadGetPayload<Record<string, never>>): Download => ({
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

export const serializeUpload = (r: Prisma.UploadGetPayload<Record<string, never>>): Upload => ({
  ...r,
  status: r.status,
  progress: Number(r.progress),
  uploadedBytes: Number(r.uploadedBytes),
  totalBytes: Number(r.totalBytes),
  speed: Number(r.speed),
  createdAt: r.createdAt.toISOString(),
  completedAt: r.completedAt?.toISOString() ?? null,
});

export const serializeFile = (r: Prisma.FileGetPayload<Record<string, never>>): File => ({
  ...r,
  size: Number(r.size),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const serializeShare = (r: Prisma.ShareGetPayload<Record<string, never>>): Share => ({
  ...r,
  status: r.status,
  createdAt: r.createdAt.toISOString(),
  expiresAt: r.expiresAt?.toISOString() ?? null,
});

export const serializeSchedule = (r: Prisma.ScheduleGetPayload<Record<string, never>>): Schedule => {
  const { filename, ...rest } = r;
  return {
    ...rest,
    filename: filename ?? undefined,
    type: r.type,
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    nextRunAt: r.nextRunAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
};

export const serializeScheduleLog = (r: Prisma.ScheduleLogGetPayload<Record<string, never>>): ScheduleLog => ({
  ...r,
  status: r.status,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
});

export const serializeActivity = (r: Prisma.ActivityGetPayload<Record<string, never>>): Activity => {
  const { metadata, ...rest } = r;
  let typedMetadata: Record<string, unknown> | undefined;
  if (metadata !== null && metadata !== undefined && typeof metadata === 'object' && !Array.isArray(metadata)) {
    typedMetadata = metadata;
  }
  return {
    ...rest,
    metadata: typedMetadata,
    createdAt: r.createdAt.toISOString(),
  };
};
