import React from 'react';
import { DownloadStats } from '../types';
import { DownloadService } from '../services/DownloadService';

interface StatsPanelProps {
  stats: DownloadStats;
  title: string;
  icon: string;
}

const downloadService = DownloadService.getInstance();

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, title, icon }) => {
  return (
    <div className="stats-panel">
      <div className="stats-header">
        <span className="stats-icon">{icon}</span>
        <h3 className="stats-title">{title}</h3>
      </div>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{stats.totalDownloads}</span>
          <span className="stat-label">总任务</span>
        </div>
        <div className="stat-item">
          <span className="stat-value text-green">{stats.completedDownloads}</span>
          <span className="stat-label">已完成</span>
        </div>
        <div className="stat-item">
          <span className="stat-value text-red">{stats.failedDownloads}</span>
          <span className="stat-label">失败</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{downloadService.formatFileSize(stats.downloadedSize)}</span>
          <span className="stat-label">已传输</span>
        </div>
      </div>
    </div>
  );
};

export { StatsPanel };
export default StatsPanel;
