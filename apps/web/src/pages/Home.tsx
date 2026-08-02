import React from 'react';
import { Link } from 'react-router';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <div className="home-hero">
        <h1 className="home-title">
          <span className="title-icon">📥</span>
          下载管理系统
        </h1>
        <p className="home-subtitle">
          高效管理文件下载与上传任务，支持断点续传、多任务管理、数据统计
        </p>
      </div>

      <div className="home-features">
        <div className="feature-card">
          <div className="feature-icon">📥</div>
          <h3 className="feature-title">下载管理</h3>
          <p className="feature-desc">
            支持多任务下载、断点续传、速度限制
          </p>
          <Link to="/downloads" className="feature-link">
            进入下载管理 →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📤</div>
          <h3 className="feature-title">上传管理</h3>
          <p className="feature-desc">
            支持多文件上传、拖拽上传、进度跟踪
          </p>
          <Link to="/uploads" className="feature-link">
            进入上传管理 →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3 className="feature-title">数据统计</h3>
          <p className="feature-desc">
            实时统计下载上传数据、趋势分析
          </p>
          <Link to="/stats" className="feature-link">
            查看数据统计 →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⏰</div>
          <h3 className="feature-title">调度管理</h3>
          <p className="feature-desc">
            定时下载任务、自动执行计划
          </p>
          <Link to="/schedule" className="feature-link">
            进入调度管理 →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔗</div>
          <h3 className="feature-title">文件分享</h3>
          <p className="feature-desc">
            创建分享链接、设置访问权限
          </p>
          <Link to="/sharing" className="feature-link">
            进入文件分享 →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📜</div>
          <h3 className="feature-title">历史记录</h3>
          <p className="feature-desc">
            查看所有下载上传历史记录
          </p>
          <Link to="/history" className="feature-link">
            查看历史记录 →
          </Link>
        </div>
      </div>

      <div className="home-stats">
        <div className="stat-item">
          <div className="stat-icon">⚡</div>
          <div className="stat-label">高性能</div>
          <div className="stat-desc">虚拟列表优化，支持万级数据渲染</div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">🔒</div>
          <div className="stat-label">安全可靠</div>
          <div className="stat-desc">断点续传、错误自动重试</div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">🎨</div>
          <div className="stat-label">界面友好</div>
          <div className="stat-desc">深色/浅色主题，响应式设计</div>
        </div>
      </div>
    </div>
  );
};

export default Home;