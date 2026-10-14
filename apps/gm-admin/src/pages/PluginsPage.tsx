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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  const [auditView, setAuditView] = useState<gm.GmPluginInfo | null>(null);

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
              <TableHead>安全审计</TableHead>
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
                    {p.securityAudit ? (
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            p.securityAudit.riskLevel === 'low' ? 'success' :
                            p.securityAudit.riskLevel === 'medium' ? 'warning' : 'error'
                          }
                          className="cursor-pointer"
                          onClick={() => setAuditView(p)}
                        >
                          {p.securityAudit.riskLevel.toUpperCase()} ({p.securityAudit.score})
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">未审计</span>
                    )}
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

      {/* AI 安全审计报告详情 */}
      <Dialog open={!!auditView} onOpenChange={() => setAuditView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🛡️ AI 安全审计报告</span>
              {auditView?.securityAudit && (
                <Badge variant={
                  auditView.securityAudit.riskLevel === 'low' ? 'success' :
                  auditView.securityAudit.riskLevel === 'medium' ? 'warning' : 'error'
                }>
                  {auditView.securityAudit.riskLevel.toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              插件 ID: {auditView?.id} | 审计得分: {auditView?.securityAudit?.score}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <h4 className="text-xs font-bold text-gray-700 mb-1">评估总结</h4>
              <p className="text-sm text-gray-600 leading-relaxed italic">
                "{auditView?.securityAudit?.summary}"
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700">审计发现 ({auditView?.securityAudit?.findings.length})</h4>
              {auditView?.securityAudit?.findings.map((f, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={f.severity === 'low' ? 'secondary' : f.severity === 'medium' ? 'warning' : 'error'} className="text-[9px]">
                      {f.severity.toUpperCase()}
                    </Badge>
                    {f.file && <span className="text-[10px] text-gray-400 font-mono">{f.file}</span>}
                  </div>
                  <p className="text-sm text-gray-800 font-medium mb-1">{f.description}</p>
                  <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2 border-l-2 border-l-indigo-300">
                    <span className="font-bold text-indigo-600 mr-1">建议:</span> {f.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setAuditView(null)}>关闭报告</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PluginsPage;
