import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Separator,
} from './ui/shadcn';

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
  onSaveSettings: (settings: AppSettings) => void | Promise<void>;
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

type TabKey = 'general' | 'download' | 'upload' | 'notifications';

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
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

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'general', label: '基础设置', icon: '🏠' },
    { key: 'download', label: '下载设置', icon: '📥' },
    { key: 'upload', label: '上传设置', icon: '📤' },
    { key: 'notifications', label: '通知设置', icon: '🔔' },
  ];

  const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center justify-between py-3">
      <Label className="text-sm font-medium text-gray-700 w-32">{label}</Label>
      <div className="flex-1 flex items-center">{children}</div>
    </div>
  );

  const renderGeneralSettings = () => (
    <Accordion type="single" collapsible defaultValue="general">
      <AccordionItem value="general">
        <AccordionTrigger>基础设置</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-1">
            <SettingRow label="主题模式">
              <Select
                value={settings.theme}
                onValueChange={(value) => handleChange('theme', value as AppSettings['theme'])}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">跟随系统</SelectItem>
                  <SelectItem value="light">浅色模式</SelectItem>
                  <SelectItem value="dark">深色模式</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            <SettingRow label="语言">
              <Select
                value={settings.language}
                onValueChange={(value) => handleChange('language', value as AppSettings['language'])}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            <SettingRow label="开机自启动">
              <Switch
                checked={settings.autoStart}
                onCheckedChange={(checked) => handleChange('autoStart', checked)}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="自动清理">
              <Switch
                checked={settings.autoCleanup}
                onCheckedChange={(checked) => handleChange('autoCleanup', checked)}
              />
            </SettingRow>

            {settings.autoCleanup && (
              <>
                <Separator />
                <SettingRow label="清理天数">
                  <Input
                    type="number"
                    value={settings.autoCleanupDays}
                    onChange={(e) => handleChange('autoCleanupDays', parseInt(e.target.value) || 30)}
                    min="1"
                    max="365"
                    className="w-24"
                  />
                </SettingRow>
              </>
            )}

            <Separator />

            <SettingRow label="最大存储任务数">
              <Input
                type="number"
                value={settings.maxStoredTasks}
                onChange={(e) => handleChange('maxStoredTasks', parseInt(e.target.value) || 100)}
                min="10"
                max="1000"
                className="w-24"
              />
            </SettingRow>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const renderDownloadSettings = () => (
    <Accordion type="single" collapsible defaultValue="download">
      <AccordionItem value="download">
        <AccordionTrigger>下载设置</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-1">
            <SettingRow label="默认下载路径">
              <Input
                type="text"
                value={settings.defaultDownloadPath}
                onChange={(e) => handleChange('defaultDownloadPath', e.target.value)}
                placeholder="请输入下载路径"
                className="w-72"
              />
            </SettingRow>

            <Separator />

            <SettingRow label="最大并发下载数">
              <Input
                type="number"
                value={settings.maxConcurrentDownloads}
                onChange={(e) => handleChange('maxConcurrentDownloads', parseInt(e.target.value) || 3)}
                min="1"
                max="10"
                className="w-24"
              />
            </SettingRow>

            <Separator />

            <SettingRow label="下载速度限制">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.downloadSpeedLimit}
                  onChange={(e) => handleChange('downloadSpeedLimit', parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="0"
                  className="w-24"
                />
                <span className="text-xs text-gray-500">KB/s (0表示不限制)</span>
              </div>
            </SettingRow>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const renderUploadSettings = () => (
    <Accordion type="single" collapsible defaultValue="upload">
      <AccordionItem value="upload">
        <AccordionTrigger>上传设置</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-1">
            <SettingRow label="最大并发上传数">
              <Input
                type="number"
                value={settings.maxConcurrentUploads}
                onChange={(e) => handleChange('maxConcurrentUploads', parseInt(e.target.value) || 2)}
                min="1"
                max="5"
                className="w-24"
              />
            </SettingRow>

            <Separator />

            <SettingRow label="上传速度限制">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.uploadSpeedLimit}
                  onChange={(e) => handleChange('uploadSpeedLimit', parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="0"
                  className="w-24"
                />
                <span className="text-xs text-gray-500">KB/s (0表示不限制)</span>
              </div>
            </SettingRow>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const renderNotificationSettings = () => (
    <Accordion type="single" collapsible defaultValue="notifications">
      <AccordionItem value="notifications">
        <AccordionTrigger>通知设置</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-1">
            <SettingRow label="启用通知">
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => handleChange('enableNotifications', checked)}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="声音提醒">
              <Switch
                checked={settings.enableSound}
                onCheckedChange={(checked) => handleChange('enableSound', checked)}
                disabled={!settings.enableNotifications}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="浏览器通知">
              <Switch
                checked={settings.enableBrowserNotifications}
                onCheckedChange={(checked) => handleChange('enableBrowserNotifications', checked)}
                disabled={!settings.enableNotifications}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="免打扰时段">
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(checked) => handleChange('quietHoursEnabled', checked)}
                disabled={!settings.enableNotifications}
              />
            </SettingRow>

            {settings.quietHoursEnabled && settings.enableNotifications && (
              <>
                <Separator />
                <SettingRow label="免打扰时间">
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={settings.quietHoursStart}
                      onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-gray-500">至</span>
                    <Input
                      type="time"
                      value={settings.quietHoursEnd}
                      onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                      className="w-32"
                    />
                  </div>
                </SettingRow>
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-gray-200 flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <DialogTitle className="text-lg font-semibold text-gray-900">设置中心</DialogTitle>
          </div>
          <DialogDescription className="sr-only">应用设置配置</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-52 bg-gray-50 p-4 border-r border-gray-200 flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 text-left ${
                  activeTab === tab.key
                    ? 'bg-white text-primary-500 font-semibold shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && renderGeneralSettings()}
            {activeTab === 'download' && renderDownloadSettings()}
            {activeTab === 'upload' && renderUploadSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-row justify-end items-center gap-3">
          <div className="flex-1">
            {hasChanges && (
              <span className="text-amber-500 text-sm font-medium">您有未保存的更改</span>
            )}
            {saveSuccess && (
              <span className="text-emerald-500 text-sm font-medium">✓ 保存成功</span>
            )}
          </div>
          <Button variant="secondary" onClick={handleReset}>
            重置
          </Button>
          <Button
            variant="default"
            onClick={() => void handleSave()}
            disabled={!hasChanges}
          >
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsPanel;
