import type { DownloadSettings, DownloadSettingsUpdate } from '@dm/shared';
import { api } from './api';

/**
 * 应用设置（下载配置）的服务端读写。
 *
 * 「下载目录」是服务端属性而非浏览器偏好，因此权威副本在后端 app_settings 表；
 * localStorage 只作为离线兜底（见 services/onboardingGate.ts）。
 */
export const SettingsService = {
  /** 读取下载设置；未配置过时后端返回默认值 + configured:false */
  async getDownload(): Promise<DownloadSettings> {
    const data = await api.get<DownloadSettings>('/settings/download');
    return data as unknown as DownloadSettings;
  },

  /**
   * 保存下载设置。
   *
   * 后端会先把 downloadDir 校验（必须在下载根目录内、存在且可写）并归一化为
   * 服务端绝对路径；返回的是归一化后的权威值，调用方应以返回值为准。
   */
  async saveDownload(input: DownloadSettingsUpdate): Promise<DownloadSettings> {
    const data = await api.put<DownloadSettings>('/settings/download', input);
    return data as unknown as DownloadSettings;
  },
};
