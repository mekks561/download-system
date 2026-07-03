import React from 'react';
import { DownloadStats } from '../types';
import { DownloadService } from '../services/DownloadService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/shadcn';

interface StatsPanelProps {
  stats: DownloadStats;
  title: string;
  icon: string;
}

const downloadService = DownloadService.getInstance();

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, title, icon }) => {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">{stats.totalDownloads}</div>
            <div className="text-sm text-gray-500">总任务</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-500">{stats.completedDownloads}</div>
            <div className="text-sm text-gray-500">已完成</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-red-500">{stats.failedDownloads}</div>
            <div className="text-sm text-gray-500">失败</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">
              {downloadService.formatFileSize(stats.downloadedSize)}
            </div>
            <div className="text-sm text-gray-500">已传输</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { StatsPanel };
export default StatsPanel;
