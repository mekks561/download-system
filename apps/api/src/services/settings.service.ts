import { prisma } from '../config/prisma';

export interface DownloadSettings {
  globalSpeedLimit: number; // 字节/秒，0 表示不限速
  sensitiveKeywords: string[];
  autoCleanupDays: number;
}

const DEFAULT_SETTINGS: DownloadSettings = {
  globalSpeedLimit: 0,
  sensitiveKeywords: [],
  autoCleanupDays: 7,
};

const SETTINGS_KEY = 'download.config';

export async function getSettings(): Promise<DownloadSettings> {
  const row = await prisma.appSetting.findUnique({
    where: { key: SETTINGS_KEY }
  });
  
  if (!row) return DEFAULT_SETTINGS;
  
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(settings: Partial<DownloadSettings>): Promise<DownloadSettings> {
  const current = await getSettings();
  const next = { ...current, ...settings };
  
  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) }
  });
  
  return next;
}
