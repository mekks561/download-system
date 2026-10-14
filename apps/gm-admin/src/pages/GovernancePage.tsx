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
  Label,
  Badge
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
  const [aiInsights, setAiInsights] = useState<gm.GmGovernanceInsight[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: string }>>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [archivingSuggestions, setArchivingSuggestions] = useState<any[]>([]);

  const fetchWorkers = async () => {
    try {
      const data = await gm.listWorkers();
      setWorkers(data);
    } catch (e) {
      console.error('获取节点状态失败:', e);
    }
  };

  const fetchAiInsights = async () => {
    setIsAiLoading(true);
    try {
      const insights = await gm.getAiGovernanceInsights();
      setAiInsights(insights);
    } catch (e) {
      console.error('获取 AI 洞察失败:', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      gm.getStorageGovernance(),
      gm.listSettings(),
      gm.getStorageByCategory(),
      gm.getDuplicates(),
      gm.getArchivingSuggestions(),
      gm.getUserProfiles(),
      fetchWorkers(),
      fetchAiInsights()
    ])
    .then(([govData, allSettings, catData, dups, archiveSugg, profiles]) => {
      setData(govData);
      setSettings(allSettings);
      setCategoryData(catData);
      setDuplicates(dups);
      setArchivingSuggestions(archiveSugg);
      setUserProfiles(profiles);
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

  const handleApplyAiAction = async (action: string) => {
    if (!confirm(`确定要执行此治理操作吗？\n操作: ${action}`)) return;
    try {
      const res = await gm.applyAiGovernanceAction(action);
      alert(`操作成功，受影响项目: ${res.affected}`);
      fetchAiInsights();
      gm.getDuplicates().then(setDuplicates);
      gm.getArchivingSuggestions().then(setArchivingSuggestions);
      gm.getUserProfiles().then(setUserProfiles);
      gm.getStorageByCategory().then(setCategoryData);
      gm.getStorageGovernance().then(setData);
    } catch (e) {
      alert(errorText(e));
    }
  };

  const handleApplyArchiving = async (taskId: number, action: string) => {
    try {
      await gm.applyArchivingAction(taskId, action);
      alert('归档指令已下发');
      gm.getArchivingSuggestions().then(setArchivingSuggestions);
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
        {/* AI 治理洞察 */}
        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-purple-700 flex items-center gap-2">
              <span>🤖 AI 智能治理洞察</span>
              {isAiLoading && <span className="text-xs font-normal text-gray-400 animate-pulse">正在分析...</span>}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchAiInsights} disabled={isAiLoading}>
              🔄 重新分析
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.length > 0 ? (
              aiInsights.map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border flex flex-col gap-1.5 ${
                    insight.type === 'warning' ? 'bg-red-50 border-red-100' :
                    insight.type === 'cleanup' ? 'bg-amber-50 border-amber-100' :
                    'bg-blue-50 border-blue-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold uppercase ${
                      insight.type === 'warning' ? 'text-red-600' :
                      insight.type === 'cleanup' ? 'text-amber-600' :
                      'text-blue-600'
                    }`}>
                      {insight.type === 'warning' ? '⚠️ 风险告警' :
                       insight.type === 'cleanup' ? '🧹 清理建议' :
                       '💡 优化建议'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">{insight.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{insight.description}</p>
                  {insight.action && (
                    <div className="mt-2 pt-2 border-t border-gray-200/50 flex justify-between items-center">
                      <code className="text-[10px] text-gray-500 font-mono">建议操作: {insight.action}</code>
                      <Button 
                        size="xs" 
                        variant="secondary" 
                        className="h-6 text-[10px]"
                        onClick={() => handleApplyAiAction(insight.action!)}
                      >
                        执行操作
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : !isAiLoading ? (
              <div className="py-8 text-center text-gray-400">
                <span className="text-2xl mb-2 block">✨</span>
                目前未发现明显的治理建议
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* 存储分布图 */}
        <Card>
          <CardHeader>
            <CardTitle>存储空间分布 (物理目录)</CardTitle>
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

        {/* AI 资源分类分布 */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center gap-2">
              <span>🧠 AI 资源语义分类分布</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData.map(d => ({ ...d, value: Number(d.value) }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatBytes(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-center text-xs">
                <p>暂无 AI 分类数据</p>
                <p className="mt-1 text-gray-300">完成任务后将自动生成分类</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI 去重优化建议 */}
        <Card className="border-t-4 border-t-orange-500 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <span>👯‍♂️ AI 语义去重建议</span>
              <span className="text-xs font-normal text-gray-500">(基于向量相似度)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {duplicates.length > 0 ? (
              <div className="space-y-4">
                {duplicates.map((group, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-gray-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{group.original.filename}</p>
                        <p className="text-[10px] text-gray-500">原始文件 | 大小: {formatBytes(Number(group.original.size))}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-white">发现 {group.matches.length} 个副本</Badge>
                    </div>
                    <div className="space-y-2 pl-4 border-l-2 border-orange-200">
                      {group.matches.map((match: any, j: number) => (
                        <div key={j} className="flex justify-between items-center text-xs">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-gray-700 truncate">{match.filename}</p>
                            <p className="text-[10px] text-gray-400">相似度: {(match.score * 100).toFixed(1)}% | 所属用户 ID: {match.userId}</p>
                          </div>
                          <Button 
                            size="xs" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleApplyAiAction(`cleanup:duplicates:${match.id}`)}
                          >
                            清理副本
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm italic">
                ✨ 系统未发现显著的重复资源
              </div>
            )}
          </CardContent>
        </Card>

        {/* 智能归档建议 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-gray-900">📦 智能文件归档建议 (Lifecycle)</CardTitle>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100">
              Cold Data Analysis
            </Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>资源名称</TableHead>
                  <TableHead>建议动作</TableHead>
                  <TableHead>预估释放</TableHead>
                  <TableHead>业务理由</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivingSuggestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">暂无冷数据归档建议</TableCell>
                  </TableRow>
                ) : (
                  archivingSuggestions.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[200px] truncate font-medium text-xs">
                        {s.filename}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.action === 'compress' ? 'default' : s.action === 'delete' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                          {s.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-emerald-600">
                        {s.expectedSaving}
                      </TableCell>
                      <TableCell className="text-[10px] text-gray-500 max-w-[200px]">
                        {s.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.action !== 'keep' && (
                          <Button 
                            size="xs" 
                            variant="outline"
                            onClick={() => handleApplyArchiving(s.taskId, s.action)}
                          >
                            立即执行
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 智能配额画像建议 */}
        <Card className="border-t-4 border-t-emerald-500 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-emerald-700 flex items-center gap-2">
              <span>📊 AI 用户行为画像与配额建议</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>偏好类别</TableHead>
                  <TableHead>当前占用</TableHead>
                  <TableHead>配额状态</TableHead>
                  <TableHead>AI 治理建议</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProfiles.map((profile, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{profile.username}</div>
                      <div className="text-[10px] text-gray-400">ID: {profile.userId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {profile.topCategory}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {formatBytes(Number(profile.currentUsage))}
                    </TableCell>
                    <TableCell>
                      <div className="w-24 space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>{profile.usagePercent}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${profile.usagePercent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(profile.usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[10px] font-bold ${
                          profile.recommendation === 'increase' ? 'text-orange-600' :
                          profile.recommendation === 'decrease' ? 'text-blue-600' :
                          'text-gray-400'
                        }`}>
                          {profile.recommendation === 'increase' ? '建议扩容' :
                           profile.recommendation === 'decrease' ? '建议回收' :
                           '保持现状'}
                        </span>
                        <span className="text-[10px] text-gray-500 italic">{profile.reason}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {profile.recommendation !== 'keep' && (
                        <Button 
                          size="xs" 
                          variant="outline"
                          onClick={() => handleApplyAiAction(`quota:auto_adjust:${profile.userId}`)}
                        >
                          应用建议
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
