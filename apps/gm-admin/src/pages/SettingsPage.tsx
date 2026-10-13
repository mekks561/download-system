import React, { useEffect, useState } from 'react';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { formatDate } from '../lib/format';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '../components/ui';

/** 系统设置：管理全局 AppSetting（如下载目录、限速等） */
const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<gm.GmAppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    gm.listSettings()
      .then(setSettings)
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (key: string, newValue: any) => {
    setSaving(key);
    try {
      const updated = await gm.updateSetting(key, newValue);
      setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p className="text-gray-500 text-center py-10">加载中...</p>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900">系统设置</h2>
      {error && (
        <div className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">{error}</div>
      )}

      {settings.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white rounded-md border border-gray-200">
          暂无系统设置
        </p>
      ) : (
        <div className="grid gap-6">
          {settings.map((s) => (
            <SettingCard
              key={s.key}
              setting={s}
              onUpdate={handleUpdate}
              isSaving={saving === s.key}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SettingCard: React.FC<{
  setting: gm.GmAppSetting;
  onUpdate: (key: string, value: any) => Promise<void>;
  isSaving: boolean;
}> = ({ setting, onUpdate, isSaving }) => {
  const [localValue, setLocalValue] = useState(JSON.stringify(setting.value, null, 2));

  useEffect(() => {
    setLocalValue(JSON.stringify(setting.value, null, 2));
  }, [setting.value]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(localValue);
      void onUpdate(setting.key, parsed);
    } catch (e) {
      alert('无效的 JSON 格式');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{setting.key}</CardTitle>
          <span className="text-xs text-gray-500">更新于: {formatDate(setting.updatedAt)}</span>
        </div>
        <CardDescription>配置项内容（JSON 格式）</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <textarea
            className="min-h-[120px] w-full rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t border-gray-100 pt-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '应用更改'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SettingsPage;
