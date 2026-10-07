import React, { useEffect, useState } from 'react';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';

/**
 * Dashboard：展示汇总卡片 + 最近 7 天每日下载数。
 * 后端 data 形状：{ userCount, downloadCount, uploadCount, fileCount, dailyDownloads }
 */
const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<gm.GmDashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    gm.getDashboard()
      .then((s) => {
        if (!cancelled) {
          setStats(s);
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

  const maxDownloads = stats?.dailyDownloads.reduce((m, d) => Math.max(m, d.downloads), 0) ?? 1;

  if (loading) return <p className="text-gray-500">加载中...</p>;
  if (error) return <p className="text-error-600">{error}</p>;
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-900">数据概览</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">用户总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">下载总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.downloadCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">上传总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.uploadCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">文件总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.fileCount}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900">最近 7 天下载趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            {stats.dailyDownloads.map((d) => {
              const pct = maxDownloads > 0 ? (d.downloads / maxDownloads) * 100 : 0;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="w-full rounded bg-primary-500" style={{ height: `${pct}px`, minHeight: pct > 0 ? 4 : 1 }} />
                  <span className="text-xs text-gray-500">{d.date.slice(5)}</span>
                  <span className="text-xs font-semibold text-gray-700">{d.downloads}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
