import React from 'react';
import StatsDashboard from '../components/StatsDashboard';

const Statistics: React.FC = () => {
  return (
    <div className="statistics-page">
      <div className="page-header">
        <h2 className="page-title">📊 数据统计</h2>
        <p className="page-desc">查看下载上传统计数据和趋势分析</p>
      </div>
      <StatsDashboard />
    </div>
  );
};

export default Statistics;