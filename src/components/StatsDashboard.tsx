import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/shadcn/Card';

interface DownloadStat {
  totalDownloads: number;
  completedDownloads: number;
  totalBytes: number;
  avgSpeed: number;
}

interface UploadStat {
  totalUploads: number;
  completedUploads: number;
  totalBytes: number;
  avgSpeed: number;
}

interface TrendData {
  date: string;
  downloads: number;
  uploads: number;
}

interface StorageData {
  used: number;
  total: number;
  breakdown: {
    downloads: number;
    uploads: number;
    cache: number;
    other: number;
  };
}

interface StatsDashboardProps {
  refreshInterval?: number;
}

const StatsDashboardComponent: React.FC<StatsDashboardProps> = ({ refreshInterval = 30000 }) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [downloadStats, setDownloadStats] = useState<DownloadStat>({
    totalDownloads: 0,
    completedDownloads: 0,
    totalBytes: 0,
    avgSpeed: 0,
  });
  const [uploadStats, setUploadStats] = useState<UploadStat>({
    totalUploads: 0,
    completedUploads: 0,
    totalBytes: 0,
    avgSpeed: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [storageData, setStorageData] = useState<StorageData>({
    used: 0,
    total: 10 * 1024 * 1024 * 1024,
    breakdown: {
      downloads: 0,
      uploads: 0,
      cache: 0,
      other: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statsRef = useRef({ downloadStats, uploadStats, trendData, storageData, timeRange });
  
  useEffect(() => {
    statsRef.current = { downloadStats, uploadStats, trendData, storageData, timeRange };
  }, [downloadStats, uploadStats, trendData, storageData, timeRange]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { timeRange: currentTimeRange, downloadStats: currentDownloadStats, 
              uploadStats: currentUploadStats, trendData: currentTrendData, 
              storageData: currentStorageData } = statsRef.current;
      
      const newDownloadStats: DownloadStat = {
        totalDownloads: 156,
        completedDownloads: 142,
        totalBytes: 2.5 * 1024 * 1024 * 1024,
        avgSpeed: 5.2 * 1024 * 1024,
      };
      
      const newUploadStats: UploadStat = {
        totalUploads: 89,
        completedUploads: 85,
        totalBytes: 1.2 * 1024 * 1024 * 1024,
        avgSpeed: 3.8 * 1024 * 1024,
      };
      
      const newTrendData = generateTrendData(currentTimeRange);
      
      const newStorageData: StorageData = {
        used: 3.7 * 1024 * 1024 * 1024,
        total: 10 * 1024 * 1024 * 1024,
        breakdown: {
          downloads: 2.1 * 1024 * 1024 * 1024,
          uploads: 1.2 * 1024 * 1024 * 1024,
          cache: 0.3 * 1024 * 1024 * 1024,
          other: 0.1 * 1024 * 1024 * 1024,
        },
      };

      if (JSON.stringify(newDownloadStats) !== JSON.stringify(currentDownloadStats)) {
        setDownloadStats(newDownloadStats);
      }
      
      if (JSON.stringify(newUploadStats) !== JSON.stringify(currentUploadStats)) {
        setUploadStats(newUploadStats);
      }
      
      if (JSON.stringify(newTrendData) !== JSON.stringify(currentTrendData)) {
        setTrendData(newTrendData);
      }
      
      if (JSON.stringify(newStorageData) !== JSON.stringify(currentStorageData)) {
        setStorageData(newStorageData);
      }
    } catch {
      setError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [timeRange]);

  useEffect(() => {
    const interval = setInterval(() => void fetchStats(), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const generateTrendData = (range: string): TrendData[] => {
    const data: TrendData[] = [];
    const now = new Date();
    let days = 1;
    
    if (range === 'week') days = 7;
    if (range === 'month') days = 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        downloads: Math.floor(Math.random() * 20) + 5,
        uploads: Math.floor(Math.random() * 15) + 3,
      });
    }
    return data;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number): string => {
    return formatBytes(bytesPerSec) + '/s';
  };

  const completionRate = useMemo(() => {
    if (downloadStats.totalDownloads === 0) return 0;
    return (downloadStats.completedDownloads / downloadStats.totalDownloads) * 100;
  }, [downloadStats]);

  const storageUsagePercent = useMemo(() => {
    return (storageData.used / storageData.total) * 100;
  }, [storageData]);

  const maxTrendValue = useMemo(() => {
    return Math.max(...trendData.map(d => Math.max(d.downloads, d.uploads)));
  }, [trendData]);

  const storageColor = useMemo(() => {
    if (storageUsagePercent > 80) return 'bg-red-500';
    if (storageUsagePercent > 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [storageUsagePercent]);

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
            <div className="text-3xl font-bold text-gray-900 mb-1">{downloadStats.totalDownloads}</div>
            <div className="text-sm text-gray-500 mb-1">总下载数</div>
            <div className="text-xs text-gray-400">完成 {downloadStats.completedDownloads} 个</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="text-3xl mb-3">📤</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{uploadStats.totalUploads}</div>
            <div className="text-sm text-gray-500 mb-1">总上传数</div>
            <div className="text-xs text-gray-400">完成 {uploadStats.completedUploads} 个</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="text-3xl mb-3">💾</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatBytes(downloadStats.totalBytes + uploadStats.totalBytes)}
            </div>
            <div className="text-sm text-gray-500 mb-1">总流量</div>
            <div className="text-xs text-gray-400">下载 {formatBytes(downloadStats.totalBytes)}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="text-3xl mb-3">🚀</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{formatSpeed(downloadStats.avgSpeed)}</div>
            <div className="text-sm text-gray-500 mb-1">平均速度</div>
            <div className="text-xs text-gray-400">上传 {formatSpeed(uploadStats.avgSpeed)}</div>
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
              {trendData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center h-full">
                  <div className="text-xs text-gray-500 mb-2">{item.date}</div>
                  <div className="flex gap-0.5 items-end h-full w-full">
                    <div
                      className="w-1/2 bg-blue-500 rounded-t transition-all duration-300 min-h-1"
                      style={{ height: `${(item.downloads / maxTrendValue) * 100}%` }}
                      title={`下载: ${item.downloads}`}
                    />
                    <div
                      className="w-1/2 bg-emerald-500 rounded-t transition-all duration-300 min-h-1"
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
                  strokeDasharray={`${completionRate * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-emerald-500">{completionRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-500">完成率</div>
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
                  className={`h-full rounded-full transition-all duration-300 ${storageColor}`}
                  style={{ width: `${storageUsagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{formatBytes(storageData.used)} / {formatBytes(storageData.total)}</span>
                <span>{storageUsagePercent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-gray-600">下载</span>
                </div>
                <span className="text-gray-500">{formatBytes(storageData.breakdown.downloads)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-600">上传</span>
                </div>
                <span className="text-gray-500">{formatBytes(storageData.breakdown.uploads)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-gray-600">缓存</span>
                </div>
                <span className="text-gray-500">{formatBytes(storageData.breakdown.cache)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-gray-600">其他</span>
                </div>
                <span className="text-gray-500">{formatBytes(storageData.breakdown.other)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatsDashboard = React.memo(StatsDashboardComponent);

export default StatsDashboard;