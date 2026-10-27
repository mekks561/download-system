import React, { useState, useEffect } from 'react';
import SettingsPanel, { AppSettings } from '../components/SettingsPanel';
import { useAppStore } from '../store';
import { SettingsService } from '../services/SettingsService';
import LoadingSpinner from '../components/LoadingSpinner';

const defaultAppSettings: AppSettings = {
  theme: 'auto',
  language: 'zh-CN',
  autoStart: false,
  defaultDownloadPath: '',
  maxConcurrentDownloads: 5,
  downloadSpeedLimit: 0,
  maxConcurrentUploads: 2,
  uploadSpeedLimit: 0,
  enableNotifications: true,
  enableSound: true,
  enableBrowserNotifications: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  autoCleanup: false,
  autoCleanupDays: 30,
  maxStoredTasks: 100,
  sensitiveKeywords: [],
};

const Settings: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useAppStore();
  
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);

  // 1. 初始化时从后端同步下载设置，其余从 localStorage 读取
  useEffect(() => {
    async function initSettings() {
      setLoading(true);
      try {
        // 从本地读取基础设置
        const saved = localStorage.getItem('appSettings');
        let baseSettings = { ...defaultAppSettings };
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Partial<AppSettings>;
            baseSettings = { ...baseSettings, ...parsed };
          } catch { /* ignore */ }
        }

        // 从后端读取下载设置（权威源）
        const remote = await SettingsService.getDownload();
        
        setAppSettings({
          ...baseSettings,
          defaultDownloadPath: remote.downloadDir,
          maxConcurrentDownloads: remote.maxConcurrent,
          downloadSpeedLimit: remote.speedLimitKBps,
          sensitiveKeywords: remote.sensitiveKeywords,
          autoCleanupDays: remote.autoCleanupDays,
        });
        
        // 同步主题到全局 store
        if (baseSettings.theme !== theme) {
          setTheme(baseSettings.theme);
        }
      } catch (error) {
        console.error('获取设置失败:', error);
      } finally {
        setLoading(false);
      }
    }
    void initSettings();
  }, [setTheme]);

  const handleSaveSettings = async (settings: AppSettings) => {
    try {
      // 2. 将下载相关的设置同步到后端
      const remote = await SettingsService.saveDownload({
        downloadDir: settings.defaultDownloadPath,
        maxConcurrent: settings.maxConcurrentDownloads,
        speedLimitKBps: settings.downloadSpeedLimit,
        sensitiveKeywords: settings.sensitiveKeywords,
        autoCleanupDays: settings.autoCleanupDays,
      });

      // 3. 更新后的值可能被服务端归一化（例如路径），合并后存入本地
      const updatedSettings: AppSettings = {
        ...settings,
        defaultDownloadPath: remote.downloadDir,
        maxConcurrentDownloads: remote.maxConcurrent,
        downloadSpeedLimit: remote.speedLimitKBps,
        sensitiveKeywords: remote.sensitiveKeywords,
        autoCleanupDays: remote.autoCleanupDays,
      };

      localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
      setAppSettings(updatedSettings);

      if (updatedSettings.theme !== theme) {
        setTheme(updatedSettings.theme);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2 className="page-title">⚙️ 设置中心</h2>
        <p className="page-desc">配置应用参数、主题、通知等选项</p>
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={{ ...appSettings, theme }}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
};

export default Settings;