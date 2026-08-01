import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/shadcn/Card';
import { API_BASE_URL } from '../constants/api';
import { formatBytes } from '../utils/format';

interface DownloadStat {
  total: number;
  completed: number;
  totalBytes: number;
  completionRate: number;
}

interface UploadStat {
  total: number;
  completed: number;
  totalBytes: number;
  completionRate: number;
}

interface ShareStat {
  total: number;
}

interface StorageStat {
  used: number;
  total: number;
}

interface TrendData {
  date: string;
  downloads: number;
  uploads: number;
}

interface FileTypeStat {
  type: string;
  name: string;
  count: number;
  totalSize: number;
  color: string;
}

interface Activity {
  id: number;
  type: 'download' | 'upload';
  filename: string;
  status: string;
  createdAt: string;
  size: number;
}

interface StatsData {
  downloads: DownloadStat;
  uploads: UploadStat;
  shares: ShareStat;
  storage: StorageStat;
}

interface StatsDashboardProps {
  refreshInterval?: number;
}

const StatsDashboardComponent: React.FC<StatsDashboardProps> = ({ refreshInterval = 30000 }) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [fileTypes, setFileTypes] = useState<FileTypeStat[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const [statsRes, trendRes, typesRes, activitiesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/stats/trend?range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/stats/file-types`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/stats/activities`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      const statsData = await statsRes.json() as { success: boolean; data?: StatsData };
      const trendData = await trendRes.json() as { success: boolean; data?: TrendData[] };
      const typesData = await typesRes.json() as { success: boolean; data?: FileTypeStat[] };
      const activitiesData = await activitiesRes.json() as { success: boolean; data?: Activity[] };

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }
      if (trendData.success && trendData.data) {
        setTrendData(trendData.data);
      }
      if (typesData.success && typesData.data) {
        setFileTypes(typesData.data);
      }
      if (activitiesData.success && activitiesData.data) {
        setActivities(activitiesData.data);
      }
    } catch {
      setError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    void fetchStats();
  }, [timeRange, fetchStats]);

  useEffect(() => {
    const interval = setInterval(() => void fetchStats(), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchStats]);

  const maxTrendValue = useMemo(() => {
    if (trendData.length === 0) return 1;
    return Math.max(...trendData.map(d => Math.max(d.downloads, d.uploads)), 1);
  }, [trendData]);

  const storageUsagePercent = useMemo(() => {
    if (!stats) return 0;
    return (stats.storage.used / stats.storage.total) * 100;
  }, [stats]);

  const storageColor = useMemo(() => {
    if (storageUsagePercent > 80) return 'bg-red-500';
    if (storageUsagePercent > 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [storageUsagePercent]);

  const totalFileTypeCount = useMemo(() => {
    return fileTypes.reduce((sum, t) => sum + t.count, 0);
  }, [fileTypes]);

  const handleTimeRangeChange = useCallback((value: 'today' | 'week' | 'month') => {
    setTimeRange(value);
  }, []);

  const TimeRangeButton: React.FC<{ label: string; value: 'today' | 'week' | 'month'; current: 'today' | 'week' | 'month' }> = React.memo(({
    label,
    value,
    current,
  }) => (
    <button
      onClick={() => handleTimeRangeChange(value)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
        current === value
          ? 'bg-white text-gray-900 shadow-sm'
          : 'bg-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  ));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return { text: '已完成', color: 'bg-emerald-100 text-emerald-600' };
      case 'pending': return { text: '等待中', color: 'bg-blue-100 text-blue-600' };
      case 'uploading':
      case 'downloading': return { text: '进行中', color: 'bg-amber-100 text-amber-600' };
      case 'paused': return { text: '已暂停', color: 'bg-gray-100 text-gray-600' };
      case 'error': return { text: '失败', color: 'bg-red-100 text-red-600' };
      case 'cancelled': return { text: '已取消', color: 'bg-gray-100 text-gray-600' };
      default: return { text: status, color: 'bg-gray-100 text-gray-600' };
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm">
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-red-500 text-sm mb-4">{error}</div>
        <button
          onClick={() => void fetchStats()}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-5 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h2 className="text-xl font-semibold text-gray-900">📊 数据统计</h2>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <TimeRangeButton label="今日" value="today" current={timeRange} />
            <TimeRangeButton label="本周" value="week" current={timeRange} />
            <TimeRangeButton label="本月" value="month" current={timeRange} />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <div className="text-gray-500 text-sm">加载统计数据...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-gray-900">📊 数据统计</h2>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <TimeRangeButton label="今日" value="today" current={timeRange} />
          <TimeRangeButton label="本周" value="week" current={timeRange} />
          <TimeRangeButton label="本月" value="month" current={timeRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="text-3xl mb-3">📥</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.downloads.total || 0}</div>
            <div className="text-sm text-gray-500 mb-1">总下载数</div>
            <div className="text-xs text-gray-400">完成 {stats?.downloads.completed || 0} 个</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="text-3xl mb-3">📤</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.uploads.total || 0}</div>
            <div className="text-sm text-gray-500 mb-1">总上传数</div>
            <div className="text-xs text-gray-400">完成 {stats?.uploads.completed || 0} 个</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="text-3xl mb-3">🔗</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.shares.total || 0}</div>
            <div className="text-sm text-gray-500 mb-1">分享链接</div>
            <div className="text-xs text-gray-400">活跃分享数</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="text-3xl mb-3">💾</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatBytes((stats?.downloads.totalBytes || 0) + (stats?.uploads.totalBytes || 0))}
            </div>
            <div className="text-sm text-gray-500 mb-1">总流量</div>
            <div className="text-xs text-gray-400">已使用空间</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📈</span> 趋势分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end h-48 gap-1">
              {trendData.map((item) => (
                <div key={item.date} className="flex-1 flex flex-col items-center h-full">
                  <div className="text-xs text-gray-500 mb-2">{item.date}</div>
                  <div className="flex gap-0.5 items-end h-full w-full">
                    <div
                      className="w-1/2 bg-blue-500 rounded-t transition-all duration-300 min-h-1 hover:bg-blue-600"
                      style={{ height: `${(item.downloads / maxTrendValue) * 100}%` }}
                      title={`下载: ${item.downloads}`}
                    />
                    <div
                      className="w-1/2 bg-emerald-500 rounded-t transition-all duration-300 min-h-1 hover:bg-emerald-600"
                      style={{ height: `${(item.uploads / maxTrendValue) * 100}%` }}
                      title={`上传: ${item.uploads}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>下载</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>上传</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📊</span> 任务完成率
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray={`${(stats?.downloads.completionRate || 0) * 2.51} 251`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-emerald-500">{(stats?.downloads.completionRate || 0).toFixed(1)}%</div>
                <div className="text-sm text-gray-500">下载完成率</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>💿</span> 存储空间
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="h-6 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${storageColor}`}
                  style={{ width: `${storageUsagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{formatBytes(stats?.storage.used || 0)} / {formatBytes(stats?.storage.total || 0)}</span>
                <span>{storageUsagePercent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-gray-600">下载</span>
                </div>
                <span className="text-gray-500">{formatBytes(stats?.downloads.totalBytes || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-600">上传</span>
                </div>
                <span className="text-gray-500">{formatBytes(stats?.uploads.totalBytes || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📁</span> 文件类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fileTypes.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">暂无文件类型数据</div>
            ) : (
              <div className="space-y-3">
                {fileTypes.map((item) => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-gray-500">{item.count} 个 ({formatBytes(item.totalSize)})</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.count / totalFileTypeCount) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>🕐</span> 最近活动
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">暂无活动记录</div>
            ) : (
              <div className="space-y-2">
                {activities.map((activity) => {
                  const statusBadge = getStatusBadge(activity.status);
                  return (
                    <div
                      key={`${activity.type}-${activity.id}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="text-xl">
                        {activity.type === 'download' ? '📥' : '📤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {activity.filename}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {formatBytes(activity.size || 0)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatsDashboard = React.memo(StatsDashboardComponent);

export default StatsDashboard;