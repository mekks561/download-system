import React, { useState, useEffect } from 'react';
import { Collapse, CollapseGroup, Form, FormItem, Switch, Input, Select, Button } from './ui';
import './SettingsPanel.css';

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  autoStart: boolean;
  defaultDownloadPath: string;
  maxConcurrentDownloads: number;
  downloadSpeedLimit: number;
  maxConcurrentUploads: number;
  uploadSpeedLimit: number;
  enableNotifications: boolean;
  enableSound: boolean;
  enableBrowserNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  autoCleanup: boolean;
  autoCleanupDays: number;
  maxStoredTasks: number;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

const defaultSettings: AppSettings = {
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
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'download' | 'upload' | 'notifications'>('general');
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setSettings(currentSettings);
    setHasChanges(false);
  }, [currentSettings]);

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      await onSaveSettings(settings);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置为默认值吗？')) {
      setSettings(defaultSettings);
      setHasChanges(true);
    }
  };

  if (!isOpen) return null;

  const renderGeneralSettings = () => (
    <CollapseGroup defaultActiveKey="general">
      <Collapse title="基础设置" key="general">
        <Form initialValues={settings}>
          <FormItem label="主题模式" labelWidth="120px" name="theme">
            <Select
              value={settings.theme}
              onChange={(value) => handleChange('theme', value as AppSettings['theme'])}
              options={[
                { value: 'auto', label: '跟随系统' },
                { value: 'light', label: '浅色模式' },
                { value: 'dark', label: '深色模式' },
              ]}
            />
          </FormItem>

          <FormItem label="语言" labelWidth="120px" name="language">
            <Select
              value={settings.language}
              onChange={(value) => handleChange('language', value as AppSettings['language'])}
              options={[
                { value: 'zh-CN', label: '简体中文' },
                { value: 'en-US', label: 'English' },
              ]}
            />
          </FormItem>

          <FormItem label="开机自启动" labelWidth="120px" name="autoStart">
            <Switch
              checked={settings.autoStart}
              onChange={(checked) => handleChange('autoStart', checked)}
            />
          </FormItem>

          <FormItem label="自动清理" labelWidth="120px" name="autoCleanup">
            <Switch
              checked={settings.autoCleanup}
              onChange={(checked) => handleChange('autoCleanup', checked)}
            />
          </FormItem>

          {settings.autoCleanup && (
            <FormItem label="清理天数" labelWidth="120px" name="autoCleanupDays">
              <Input
                type="number"
                value={String(settings.autoCleanupDays)}
                onChange={(value) => handleChange('autoCleanupDays', parseInt(value) || 30)}
                min="1"
                max="365"
                style={{ width: '100px' }}
              />
            </FormItem>
          )}

          <FormItem label="最大存储任务数" labelWidth="120px" name="maxStoredTasks">
            <Input
              type="number"
              value={String(settings.maxStoredTasks)}
              onChange={(value) => handleChange('maxStoredTasks', parseInt(value) || 100)}
              min="10"
              max="1000"
              style={{ width: '100px' }}
            />
          </FormItem>
        </Form>
      </Collapse>
    </CollapseGroup>
  );

  const renderDownloadSettings = () => (
    <CollapseGroup defaultActiveKey="download">
      <Collapse title="下载设置" key="download">
        <Form initialValues={settings}>
          <FormItem label="默认下载路径" labelWidth="120px" name="defaultDownloadPath">
            <Input
              type="text"
              value={settings.defaultDownloadPath}
              onChange={(value) => handleChange('defaultDownloadPath', value)}
              placeholder="请输入下载路径"
              style={{ width: '300px' }}
            />
          </FormItem>

          <FormItem label="最大并发下载数" labelWidth="120px" name="maxConcurrentDownloads">
            <Input
              type="number"
              value={String(settings.maxConcurrentDownloads)}
              onChange={(value) => handleChange('maxConcurrentDownloads', parseInt(value) || 3)}
              min="1"
              max="10"
              style={{ width: '100px' }}
            />
          </FormItem>

          <FormItem label="下载速度限制" labelWidth="120px" name="downloadSpeedLimit">
            <Input
              type="number"
              value={String(settings.downloadSpeedLimit)}
              onChange={(value) => handleChange('downloadSpeedLimit', parseInt(value) || 0)}
              min="0"
              placeholder="0"
              style={{ width: '100px' }}
            />
            <span style={{ marginLeft: '8px', color: '#666', fontSize: '12px' }}>KB/s (0表示不限制)</span>
          </FormItem>
        </Form>
      </Collapse>
    </CollapseGroup>
  );

  const renderUploadSettings = () => (
    <CollapseGroup defaultActiveKey="upload">
      <Collapse title="上传设置" key="upload">
        <Form initialValues={settings}>
          <FormItem label="最大并发上传数" labelWidth="120px" name="maxConcurrentUploads">
            <Input
              type="number"
              value={String(settings.maxConcurrentUploads)}
              onChange={(value) => handleChange('maxConcurrentUploads', parseInt(value) || 2)}
              min="1"
              max="5"
              style={{ width: '100px' }}
            />
          </FormItem>

          <FormItem label="上传速度限制" labelWidth="120px" name="uploadSpeedLimit">
            <Input
              type="number"
              value={String(settings.uploadSpeedLimit)}
              onChange={(value) => handleChange('uploadSpeedLimit', parseInt(value) || 0)}
              min="0"
              placeholder="0"
              style={{ width: '100px' }}
            />
            <span style={{ marginLeft: '8px', color: '#666', fontSize: '12px' }}>KB/s (0表示不限制)</span>
          </FormItem>
        </Form>
      </Collapse>
    </CollapseGroup>
  );

  const renderNotificationSettings = () => (
    <CollapseGroup defaultActiveKey="notifications">
      <Collapse title="通知设置" key="notifications">
        <Form initialValues={settings}>
          <FormItem label="启用通知" labelWidth="120px" name="enableNotifications">
            <Switch
              checked={settings.enableNotifications}
              onChange={(checked) => handleChange('enableNotifications', checked)}
            />
          </FormItem>

          <FormItem label="声音提醒" labelWidth="120px" name="enableSound">
            <Switch
              checked={settings.enableSound}
              onChange={(checked) => handleChange('enableSound', checked)}
              disabled={!settings.enableNotifications}
            />
          </FormItem>

          <FormItem label="浏览器通知" labelWidth="120px" name="enableBrowserNotifications">
            <Switch
              checked={settings.enableBrowserNotifications}
              onChange={(checked) => handleChange('enableBrowserNotifications', checked)}
              disabled={!settings.enableNotifications}
            />
          </FormItem>

          <FormItem label="免打扰时段" labelWidth="120px" name="quietHoursEnabled">
            <Switch
              checked={settings.quietHoursEnabled}
              onChange={(checked) => handleChange('quietHoursEnabled', checked)}
              disabled={!settings.enableNotifications}
            />
          </FormItem>

          {settings.quietHoursEnabled && settings.enableNotifications && (
            <FormItem label="免打扰时间" labelWidth="120px" name="quietHours">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
                <span style={{ color: '#666' }}>至</span>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
              </div>
            </FormItem>
          )}
        </Form>
      </Collapse>
    </CollapseGroup>
  );

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h2 className="settings-panel-title">⚙️ 设置中心</h2>
          <button className="settings-panel-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-panel-content">
          <div className="settings-panel-sidebar">
            <button
              className={`settings-panel-sidebar-item${activeTab === 'general' ? ' active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <span className="settings-panel-sidebar-icon">🏠</span>
              <span>基础设置</span>
            </button>
            <button
              className={`settings-panel-sidebar-item${activeTab === 'download' ? ' active' : ''}`}
              onClick={() => setActiveTab('download')}
            >
              <span className="settings-panel-sidebar-icon">📥</span>
              <span>下载设置</span>
            </button>
            <button
              className={`settings-panel-sidebar-item${activeTab === 'upload' ? ' active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <span className="settings-panel-sidebar-icon">📤</span>
              <span>上传设置</span>
            </button>
            <button
              className={`settings-panel-sidebar-item${activeTab === 'notifications' ? ' active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <span className="settings-panel-sidebar-icon">🔔</span>
              <span>通知设置</span>
            </button>
          </div>

          <div className="settings-panel-main">
            {activeTab === 'general' && renderGeneralSettings()}
            {activeTab === 'download' && renderDownloadSettings()}
            {activeTab === 'upload' && renderUploadSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
          </div>
        </div>

        <div className="settings-panel-footer">
          {hasChanges && (
            <span className="settings-panel-change-indicator">您有未保存的更改</span>
          )}
          {saveSuccess && (
            <span className="settings-panel-success-message">✓ 保存成功</span>
          )}
          <Button variant="secondary" onClick={handleReset}>
            重置
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;