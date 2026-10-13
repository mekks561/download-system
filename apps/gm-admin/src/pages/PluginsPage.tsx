import React, { useCallback, useEffect, useState } from 'react';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';

/** 插件管理：列表展示、启用/禁用、物理卸载 */
const PluginsPage: React.FC = () => {
  const [plugins, setPlugins] = useState<gm.GmPluginInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPlugins = useCallback(() => {
    setLoading(true);
    gm.listPlugins()
      .then(setPlugins)
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; type: 'toggle' | 'uninstall'; enabled?: boolean } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleAction = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      if (confirmTarget.type === 'toggle') {
        await gm.togglePlugin(confirmTarget.id, !!confirmTarget.enabled);
        setPlugins((prev) =>
          prev.map((p) => (p.id === confirmTarget.id ? { ...p, enabled: !!confirmTarget.enabled } : p)),
        );
      } else {
        await gm.uninstallPlugin(confirmTarget.id);
        setPlugins((prev) => prev.filter((p) => p.id !== confirmTarget.id));
      }
      setConfirmTarget(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">插件管理</h2>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="plugin-upload"
            accept=".zip"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setLoading(true);
              try {
                await gm.uploadPlugin(file);
                fetchPlugins();
              } catch (err) {
                setError(errorText(err));
              } finally {
                setLoading(false);
                e.target.value = '';
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => document.getElementById('plugin-upload')?.click()}
            disabled={loading}
          >
            上传插件
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">{error}</div>
      )}
      <div className="rounded-md border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>版本</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : plugins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">暂无插件</TableCell>
              </TableRow>
            ) : (
              plugins.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{p.version}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-gray-500" title={p.description}>
                    {p.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.enabled ? 'success' : 'warning'}>
                      {p.enabled ? '已启用' : '已禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={p.enabled ? 'outline' : 'default'}
                        onClick={() =>
                          setConfirmTarget({
                            id: p.id,
                            name: p.name,
                            type: 'toggle',
                            enabled: !p.enabled,
                          })
                        }
                      >
                        {p.enabled ? '禁用' : '启用'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setConfirmTarget({ id: p.id, name: p.name, type: 'uninstall' })
                        }
                      >
                        卸载
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        title={
          confirmTarget?.type === 'uninstall'
            ? '确认卸载插件'
            : confirmTarget?.enabled
            ? '确认启用插件'
            : '确认禁用插件'
        }
        description={
          confirmTarget?.type === 'uninstall'
            ? `确定要卸载插件「${confirmTarget.name}」吗？此操作将物理删除插件目录。`
            : `确定要${confirmTarget?.enabled ? '启用' : '禁用'}插件「${confirmTarget?.name}」吗？`
        }
        confirmText="确认"
        loading={confirmLoading}
        onConfirm={() => { void handleAction(); }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};

export default PluginsPage;
