import {
  DownloadSettingsUpdateSchema,
  type DownloadSettings,
  type DownloadSettingsUpdate,
} from '@dm/shared';
import { prisma } from '../config/prisma';
import { assertUsableDownloadDir } from './storage.service';

/**
 * 应用级设置的服务端持久化。
 *
 * 为什么需要：S1 的向导 Step 3 原本只把下载配置写进浏览器 localStorage，
 * 换个浏览器就丢、服务端也拿不到——而「下载目录」本质上是服务端属性。
 * 这里用 app_settings 这张 KV 表把它落库，localStorage 退化为离线兜底。
 *
 * 单实例部署，键全局唯一，不按用户分片；写入前复用 storage.service 的边界校验
 * （目录必须在可浏览根目录内、存在、可写），保证存进去的值下载引擎真的能用。
 */

/** KV 键名 */
const DOWNLOAD_CONFIG_KEY = 'download.config';

/** 未配置时的默认值（与前端向导 DEFAULT_CONFIG 同一套数值） */
export const DEFAULT_DOWNLOAD_SETTINGS: Omit<DownloadSettings, 'configured'> = {
  downloadDir: '',
  maxConcurrent: 5,
  speedLimitKBps: 0,
};

/** 读取库里的 JSON 并按其契约校验；坏数据（手改库/旧格式）返回 null 由调用方回落 */
function parseStoredConfig(raw: string): Omit<DownloadSettings, 'configured'> | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = DownloadSettingsUpdateSchema.safeParse(json);
  if (!parsed.success) return null;
  return {
    downloadDir: parsed.data.downloadDir,
    maxConcurrent: parsed.data.maxConcurrent,
    speedLimitKBps: parsed.data.speedLimitKBps,
  };
}

/** 当前下载设置（未配置时返回默认值 + configured:false） */
export async function getDownloadSettings(): Promise<DownloadSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: DOWNLOAD_CONFIG_KEY } });
  if (!row) return { ...DEFAULT_DOWNLOAD_SETTINGS, configured: false };

  const parsed = parseStoredConfig(row.value);
  if (!parsed) return { ...DEFAULT_DOWNLOAD_SETTINGS, configured: false };
  return { ...parsed, configured: true };
}

/**
 * 保存下载设置。
 *
 * `downloadDir` 会被归一化为服务端绝对路径后再落库（相对路径按「相对下载根目录」
 * 解释），并校验其位于可浏览根目录内、存在且可写——校验失败直接抛 AppError，
 * 不写库，避免留下一个「配置成功但根本不能用」的目录。
 */
export async function saveDownloadSettings(input: DownloadSettingsUpdate): Promise<DownloadSettings> {
  const downloadDir = await assertUsableDownloadDir(input.downloadDir);

  const value = JSON.stringify({
    downloadDir,
    maxConcurrent: input.maxConcurrent,
    speedLimitKBps: input.speedLimitKBps,
  });

  await prisma.appSetting.upsert({
    where: { key: DOWNLOAD_CONFIG_KEY },
    create: { key: DOWNLOAD_CONFIG_KEY, value },
    update: { value },
  });

  return {
    downloadDir,
    maxConcurrent: input.maxConcurrent,
    speedLimitKBps: input.speedLimitKBps,
    configured: true,
  };
}
