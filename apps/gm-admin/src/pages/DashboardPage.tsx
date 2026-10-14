import React, { useEffect, useState } from 'react';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'];

/**
 * Dashboard：展示汇总卡片 + 集群状态 + 存储分布 + 下载趋势。
 */
const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<gm.GmDashboardStats | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [storageTrends, setStorageTrends] = useState<any[]>([]);
  const [trafficStats, setTrafficStats] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [autonomousLogs, setAutonomousLogs] = useState<any[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      gm.getDashboard(), 
      gm.listWorkers(),
      gm.getStorageByCategory(),
      gm.getStorageTrends(),
      gm.getTrafficStats(),
      gm.getTrafficForecast(),
      gm.getAutonomousLogs(),
      gm.getAutoScalerStatus()
    ])
      .then(([s, w, c, t, ts, f, logs, status]) => {
        if (!cancelled) {
          setStats(s);
          setWorkers(w);
          setCategoryData(c.map(item => ({
            ...item,
            value: Number(BigInt(item.value) / 1024n / 1024n) // 转换为 MB
          })));
          setStorageTrends(t);
          setTrafficStats(ts);
          setForecast(f);
          setAutonomousLogs(logs);
          setIsAutoMode(status.enabled);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleToggleAutoMode = async () => {
    try {
      const res = await gm.toggleAutoScaler(!isAutoMode);
      setIsAutoMode(res.enabled);
      alert(res.enabled ? '已开启 AI 无人值守模式' : '已关闭 AI 无人值守模式');
    } catch (e) {
      alert(errorText(e));
    }
  };

  if (loading) return <p className="text-gray-500">加载中...</p>;
  if (error) return <p className="text-error-600">{error}</p>;
  if (!stats) return null;

  // 计算地域分布
  const regionStats = workers.reduce((acc: any[], w) => {
    const region = w.region || 'Unknown';
    const existing = acc.find(r => r.name === region);
    if (existing) {
      existing.value += 1;
      existing.tasks += w.activeTasks;
    } else {
      acc.push({ name: region, value: 1, tasks: w.activeTasks });
    }
    return acc;
  }, []);

  const formatSize = (mb: number) => {
    if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-900">数据概览</h2>
      
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '用户总数', value: stats.userCount, icon: '👥' },
          { label: '下载总数', value: stats.downloadCount, icon: '📥' },
          { label: '上传总数', value: stats.uploadCount, icon: '📤' },
          { label: '文件总数', value: stats.fileCount, icon: '📂' },
        ].map(item => (
          <Card key={item.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">{item.label}</CardTitle>
              <span className="text-lg">{item.icon}</span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 集群状态面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🖥️ 集群节点状态</span>
                <span className="text-xs font-normal text-gray-500">(活动: {workers.length})</span>
              </div>
              <Badge variant={workers.length > 0 ? 'success' : 'warning'}>
                {workers.length > 0 ? '运行中' : '离线'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">暂无活动 Worker 节点</p>
            ) : (
              <div className="flex flex-col gap-4">
                {workers.map((w) => {
                  const cpuLoad = w.cpuUsage * 100;
                  const memLoad = (1 - w.memoryUsage.free / w.memoryUsage.total) * 100;
                  const loadScore = (cpuLoad * 0.3 + memLoad * 0.2 + (w.activeTasks * 10) * 0.5);

                  return (
                    <div key={w.workerId} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{w.workerId}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-600 border-blue-100">
                              {w.region || 'default'}
                            </Badge>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">{w.ip}:{w.port}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-gray-700">任务数: {w.activeTasks}</span>
                          <p className="text-[10px] text-gray-400">心跳: {new Date(w.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>综合负载评分</span>
                          <span className={loadScore > 80 ? 'text-red-500 font-bold' : 'text-gray-700'}>
                            {loadScore.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              loadScore > 80 ? 'bg-red-500' : 
                              loadScore > 50 ? 'bg-amber-500' : 
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, loadScore)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-gray-400 uppercase font-semibold">CPU</span>
                          <div className="h-1 bg-gray-200 rounded-full">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${cpuLoad}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-gray-400 uppercase font-semibold">MEM</span>
                          <div className="h-1 bg-gray-200 rounded-full">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${memLoad}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-gray-400 uppercase font-semibold">DISK</span>
                          <div className="h-1 bg-gray-200 rounded-full">
                            <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.min(100, (1 - w.diskUsage.available / (w.diskUsage.available + 1024 * 1024 * 1024 * 10)) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 集群负载热图 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span>🔥 集群负载热图</span>
              <span className="text-xs font-normal text-gray-500">(空间密度分布)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-2">
              {workers.length > 0 ? (
                workers.map((w) => {
                  const cpuLoad = w.cpuUsage * 100;
                  const memLoad = (1 - w.memoryUsage.free / w.memoryUsage.total) * 100;
                  const loadScore = (cpuLoad * 0.3 + memLoad * 0.2 + (w.activeTasks * 10) * 0.5);
                  
                  const getHeatColor = (score: number) => {
                    if (score > 80) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
                    if (score > 60) return 'bg-orange-500';
                    if (score > 40) return 'bg-amber-400';
                    if (score > 20) return 'bg-emerald-400';
                    return 'bg-emerald-500/20';
                  };

                  return (
                    <Tooltip key={w.workerId}>
                      <TooltipTrigger asChild>
                        <div 
                          className={`aspect-square rounded-sm cursor-help transition-all duration-300 hover:scale-110 ${getHeatColor(loadScore)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-[10px] space-y-1">
                          <p className="font-bold border-b pb-1 mb-1">{w.workerId}</p>
                          <p>负载评分: {loadScore.toFixed(0)}%</p>
                          <p>任务数: {w.activeTasks}</p>
                          <p>CPU: {(w.cpuUsage * 100).toFixed(1)}%</p>
                          <p>MEM: {((1 - w.memoryUsage.free / w.memoryUsage.total) * 100).toFixed(1)}%</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center text-gray-400 text-xs italic">
                  等待节点连接...
                </div>
              )}
              {/* 填充占位符以显示网格感 */}
              {workers.length > 0 && Array.from({ length: Math.max(0, 20 - workers.length) }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square rounded-sm bg-gray-50 border border-gray-100/50" />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-400">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/20" /> 空闲</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 低负载</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 中负载</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 高负载</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 满载</div>
            </div>
          </CardContent>
        </Card>

        {/* 存储分布图表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900">🤖 AI 资源分类分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无分类统计数据</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatSize(value), '占用体积']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 全球地域流量分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span>🌍 全球地域流量分布</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-100">
                Geo-Aware
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {regionStats.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无节点分布数据</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regionStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="tasks"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}节点`}
                    >
                      {regionStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [value, `活跃任务 (${name})`]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 存储治理趋势图表 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900">📈 存储治理占用趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              {storageTrends.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无趋势统计数据 (请等待系统自动扫描)</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={storageTrends}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${(val / 1024).toFixed(1)}GB`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatSize(value), '']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Area 
                      name="总占用"
                      type="monotone" 
                      dataKey="total" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                    <Area 
                      name="下载目录"
                      type="monotone" 
                      dataKey="downloads" 
                      stroke="#0ea5e9" 
                      strokeWidth={1}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI 流量预测与弹性伸缩 */}
        <Card className="lg:col-span-2 border-t-4 border-t-indigo-500">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🔮 AI 流量预测与弹性伸缩</span>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                  Industrialization 2.0
                </Badge>
              </div>
              {forecast?.recommendation && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    forecast.recommendation.action === 'scale_up' ? 'text-red-600' :
                    forecast.recommendation.action === 'scale_down' ? 'text-blue-600' :
                    'text-gray-400'
                  }`}>
                    {forecast.recommendation.action === 'scale_up' ? '🚀 建议扩容' :
                     forecast.recommendation.action === 'scale_down' ? '📉 建议缩容' :
                     '⚖️ 负载均衡'}
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...trafficStats.slice(-24), ...(forecast?.forecast || [])]}>
                      <defs>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                        labelFormatter={(label) => `时间: ${label}`}
                      />
                      <Area 
                        name="实际/预测流量"
                        type="monotone" 
                        dataKey={(d) => d.predictedCount || d.count} 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorForecast)" 
                        strokeDasharray={(d) => d.predictedCount ? "5 5" : "0"}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex items-center justify-center gap-4 text-[9px] text-gray-400">
                  <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500" /> 历史流量</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 border-t border-dashed" /> AI 预测流量</div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1">
                    <span>💡 伸缩决策建议</span>
                  </h4>
                  {forecast?.recommendation ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">目标 Worker 数</span>
                        <span className="text-lg font-black text-indigo-600">{forecast.recommendation.targetWorkerCount}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                        <p className="text-[10px] text-gray-600 leading-relaxed italic">
                          "{forecast.recommendation.reason}"
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-gray-400">当前资源利用率</span>
                          <span className="text-gray-600">64%</span>
                        </div>
                        <div className="w-full h-1 bg-gray-200 rounded-full">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '64%' }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400 text-[10px]">
                      正在生成 AI 预测...
                    </div>
                  )}
                </div>
                
                <button 
                  className={`mt-4 w-full py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${
                    isAutoMode 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                  onClick={handleToggleAutoMode}
                >
                  {isAutoMode ? '🛡️ 无人值守运行中' : '🤖 开启无人值守'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 自动化操作日志 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span>📜 集群自动化审计日志</span>
              <span className="text-[10px] font-normal text-gray-400">AI & Autonomous Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {autonomousLogs.length > 0 ? (
                autonomousLogs.map((log, i) => (
                  <div key={i} className="text-xs p-3 bg-gray-50 rounded-lg border-l-4 border-l-indigo-500 flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{log.module}</Badge>
                        <span className="text-gray-400 text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700">{log.message}</p>
                    </div>
                    <Badge variant={log.type === 'scale_up' ? 'success' : log.type === 'scale_down' ? 'warning' : log.type === 'balancing' ? 'info' : 'secondary'}>
                      {log.type.toUpperCase()}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs italic">
                  暂无自动化操作记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 下载趋势图表 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900">最近 7 天下载趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyDownloads}>
                  <defs>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(str) => str.slice(5)}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="downloads" 
                    stroke="#0ea5e9" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorDownloads)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
