import React, { useEffect, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { formatBytes } from '../lib/format';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Input,
  Label
} from '../components/ui';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const GovernancePage: React.FC = () => {
  const [data, setData] = useState<gm.GmStorageGovernanceResult | null>(null);
  const [settings, setSettings] = useState<gm.GmAppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleanupPreview, setCleanupPreview] = useState<gm.GmCleanupPreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [workers, setWorkers] = useState<gm.WorkerHeartbeat[]>([]);

  const fetchWorkers = async () => {
    try {
      const data = await gm.listWorkers();
      setWorkers(data);
    } catch (e) {
      console.error('获取节点状态失败:', e);
    }
  };

  useEffect(() => {
    Promise.all([
      gm.getStorageGovernance(),
      gm.listSettings(),
      fetchWorkers()
    ])
    .then(([govData, allSettings]) => {
      setData(govData);
      setSettings(allSettings);
    })
    .catch((e) => setError(errorText(e)))
    .finally(() => setLoading(false));

    // Poll workers every 5 seconds
    const interval = setInterval(fetchWorkers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      await gm.updateSetting(key, value);
      const newSettings = await gm.listSettings();
      setSettings(newSettings);
    } catch (e) {
      alert(errorText(e));
    }
  };

  const fetchCleanupPreview = async () => {
    setIsPreviewLoading(true);
    try {
      const preview = await gm.getCleanupPreview(cleanupDays);
      setCleanupPreview(preview);
    } catch (e) {
      console.error('获取清理预览失败:', e);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchCleanupPreview();
    }
  }, [cleanupDays, loading]);

  const handleTriggerCleanup = async () => {
    if (!confirm(`确定要清理 ${cleanupDays} 天前的文件吗？`)) return;
    try {
      await gm.triggerCleanup(cleanupDays);
      alert('清理任务已启动');
    } catch (e) {
      alert(errorText(e));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        未获取到统计数据，请尝试 <Button variant="outline" size="sm" onClick={() => window.location.reload()}>刷新页面</Button>
      </div>
    );
  }

  const { stats, topUsage } = data;
  const pieData = [
    { name: '下载目录', value: Number(stats.downloadDir) || 0 },
    { name: '上传目录', value: Number(stats.uploadDir) || 0 },
    { name: '插件目录', value: Number(stats.pluginDir) || 0 },
    { name: '数据库', value: Number(stats.dbSize) || 0 },
  ].filter(d => d.value > 0);

  const autoCleanup = settings.find(s => s.key === 'STORAGE_AUTO_CLEANUP')?.value ?? false;
  const quotaGb = settings.find(s => s.key === 'STORAGE_QUOTA_GB')?.value ?? 100;
  
  const downloadConfig = settings.find(s => s.key === 'download.config')?.value ?? {
    globalSpeedLimit: 0,
    sensitiveKeywords: [],
    autoCleanupDays: 7
  };

  const handleUpdateDownloadConfig = (updates: any) => {
    handleUpdateSetting('download.config', { ...downloadConfig, ...updates });
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <h2 className="text-2xl font-bold text-gray-900">资源治理中心</h2>
      
      {/* 节点监控面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map(worker => (
          <Card key={worker.workerId} className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold">{worker.workerId}</CardTitle>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold">{worker.status}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">活跃任务</span>
                  <span className="font-mono font-bold">{worker.activeTasks}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                    <span>CPU 负载</span>
                    <span>{(worker.cpuUsage * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500" 
                      style={{ width: `${Math.min(worker.cpuUsage * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                    <span>磁盘空间 ({formatBytes(worker.diskUsage.available)} 可用)</span>
                    <span>{(100 - (worker.diskUsage.available / worker.diskUsage.total * 100)).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-500" 
                      style={{ width: `${100 - (worker.diskUsage.available / worker.diskUsage.total * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {workers.length === 0 && (
          <Card className="col-span-full border-dashed border-2 bg-gray-50">
            <CardContent className="py-8 text-center text-gray-400">
              <span className="text-2xl mb-2 block">📡</span>
              暂无在线的下载节点
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 存储分布图 */}
        <Card>
          <CardHeader>
            <CardTitle>存储空间分布</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatBytes(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400">暂无占用数据</div>
            )}
          </CardContent>
        </Card>

        {/* 策略配置 */}
        <Card>
          <CardHeader>
            <CardTitle>治理策略配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">自动清理过期资源</Label>
                <p className="text-sm text-gray-500">定期清理超过保留期限的临时文件和分享记录</p>
              </div>
              <Button 
                variant={autoCleanup ? "default" : "outline"}
                onClick={() => handleUpdateSetting('STORAGE_AUTO_CLEANUP', !autoCleanup)}
              >
                {autoCleanup ? '已开启' : '已关闭'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>软配额预警阈值 (GB)</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  defaultValue={quotaGb}
                  onBlur={(e) => handleUpdateSetting('STORAGE_QUOTA_GB', Number(e.target.value))}
                />
                <Button variant="outline">保存</Button>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <Label className="text-base font-semibold">全局下载设置</Label>
              
              <div className="space-y-2">
                <Label>全局下载限速 (MB/s, 0表示不限速)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={downloadConfig.globalSpeedLimit / 1024 / 1024}
                    onChange={(e) => handleUpdateDownloadConfig({ globalSpeedLimit: Number(e.target.value) * 1024 * 1024 })}
                  />
                  <Button variant="outline" onClick={() => handleUpdateDownloadConfig({})}>应用</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>敏感审计关键词 (逗号分隔)</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={downloadConfig.sensitiveKeywords.join(', ')}
                  onChange={(e) => handleUpdateDownloadConfig({ 
                    sensitiveKeywords: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                  })}
                  placeholder="例如: 广告, 病毒, 侵权"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base">手动清理</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-sm text-gray-500">清理超过</span>
                  <Input 
                    type="number" 
                    className="inline-block w-20 mx-2" 
                    value={cleanupDays}
                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                  />
                  <span className="text-sm text-gray-500">天的资源</span>
                </div>
                <Button variant="destructive" onClick={handleTriggerCleanup}>立即执行</Button>
              </div>

              {cleanupPreview && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md border border-dashed border-gray-300">
                  <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase">清理预估</h4>
                  {isPreviewLoading ? (
                    <p className="text-xs text-gray-400">正在计算...</p>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">过期分享文件:</span>
                        <span className="font-mono">{cleanupPreview.expiredShares.length} 个 ({formatBytes(cleanupPreview.expiredShares.reduce((acc, s) => acc + Number(s.size), 0))})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">僵尸临时文件 (.part):</span>
                        <span className="font-mono">{cleanupPreview.zombieParts.length} 个 ({formatBytes(cleanupPreview.zombieParts.reduce((acc, p) => acc + Number(p.size), 0))})</span>
                      </div>
                      <div className="pt-1 border-t border-gray-200 mt-1 flex justify-between font-bold text-primary-600">
                        <span>总计可释放:</span>
                        <span>{formatBytes(
                          cleanupPreview.expiredShares.reduce((acc, s) => acc + Number(s.size), 0) + 
                          cleanupPreview.zombieParts.reduce((acc, p) => acc + Number(p.size), 0)
                        )}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TOP 占用列表 */}
      <Card>
        <CardHeader>
          <CardTitle>TOP 占用资源列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">占用大小</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsage.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium truncate max-w-md">{item.name}</TableCell>
                  <TableCell>{item.type === 'directory' ? '目录' : '文件'}</TableCell>
                  <TableCell className="text-right font-mono">{formatBytes(Number(item.size))}</TableCell>
                </TableRow>
              ))}
              {topUsage.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-8">暂无数据</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GovernancePage;
