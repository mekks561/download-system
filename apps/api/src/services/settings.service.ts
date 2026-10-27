import { existsSync } from 'node:fs';
import { prisma } from '../config/prisma.js';
import type { DownloadSettings, DownloadSettingsUpdate } from '@dm/shared';
import { AppError } from '../utils/errors.js';
import path from 'node:path';

export { DownloadSettings };

export const DEFAULT_DOWNLOAD_SETTINGS: DownloadSettings = {
  downloadDir: '',
  maxConcurrent: 5,
  speedLimitKBps: 0,
  sensitiveKeywords: [],
  autoCleanupDays: 7,
  configured: false,
};

const SETTINGS_KEY = 'download.config';

/**
 * 获取下载根目录基准路径
 */
export function getDownloadRoot(): string {
  const configured = process.env.DM_DOWNLOAD_ROOT?.trim();
  if (configured && configured.length > 0) return path.resolve(configured);
  return path.resolve(process.cwd(), 'downloads');
}

export async function getSettings(): Promise<DownloadSettings> {
  const row = await prisma.appSetting.findUnique({
    where: { key: SETTINGS_KEY }
  });
  
  if (!row) return DEFAULT_DOWNLOAD_SETTINGS;
  
  try {
    const val = JSON.parse(row.value);
    return { 
      ...DEFAULT_DOWNLOAD_SETTINGS, 
      ...val,
      configured: true 
    };
  } catch {
    return DEFAULT_DOWNLOAD_SETTINGS;
  }
}

// 别名，为了兼容单测与旧代码
export const getDownloadSettings = getSettings;

export async function updateSettings(input: DownloadSettingsUpdate): Promise<DownloadSettings> {
  const root = getDownloadRoot();
  let finalPath = input.downloadDir;

  // 1. 路径归一化与校验（单测要求逻辑）
  if (!path.isAbsolute(finalPath)) {
    finalPath = path.join(root, finalPath);
  }

  // 目录越界检查：必须在根目录下
  const relative = path.relative(root, finalPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError('FORBIDDEN', 403, '下载目录越界，必须位于下载根目录下');
  }

  // 目录存在性检查
  if (!existsSync(finalPath)) {
    throw new AppError('NOT_FOUND', 404, '指定的下载目录不存在');
  }

  const next = {
    downloadDir: finalPath,
    maxConcurrent: input.maxConcurrent,
    speedLimitKBps: input.speedLimitKBps,
    sensitiveKeywords: input.sensitiveKeywords,
    autoCleanupDays: input.autoCleanupDays,
  };
  
  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) }
  });
  
  return { ...next, configured: true };
}

// 别名，为了兼容单测与旧代码
export const saveDownloadSettings = updateSettings;
