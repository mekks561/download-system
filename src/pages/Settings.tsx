import React, { useState, useEffect } from 'react';
import SettingsPanel, { AppSettings } from '../components/SettingsPanel';
import { useAppStore } from '../store';

const Settings: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const { theme, setTheme } = useAppStore();
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'auto',
    language: 'zh-CN',
    autoStart: false,
    defaultDownloadPath: 'C:\\Downloads',
    maxConcurrentDownloads: 3,
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
  });

  useEffect(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<AppSettings>;
        setAppSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        console.warn('Failed to parse saved settings');
      }
    }
  }, []);

  const handleSaveSettings = async (settings: AppSettings) => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
      setAppSettings(settings);
      if (settings.theme !== appSettings.theme) {
        setTheme(settings.theme);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      throw error;
    }
  };

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