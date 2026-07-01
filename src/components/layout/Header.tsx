import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import NotificationPanel from '../NotificationPanel';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, theme, setTheme } = useAppStore();

  const handleLogout = () => {
    void logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">
          <span className="title-icon">📥</span>
          下载管理系统
          <span className="version-badge">v2.0</span>
        </h1>
        <p className="app-subtitle">高效管理文件下载与上传任务</p>
      </div>
      
      <div className="user-info">
        <NotificationPanel />
        <span className="user-name">👤 {user?.username || 'Guest'}</span>
        
        <button
          className="theme-btn"
          onClick={toggleTheme}
          title={`当前主题: ${theme === 'dark' ? '深色' : theme === 'light' ? '浅色' : '跟随系统'}`}
        >
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🔄'}
        </button>
        
        <button className="logout-btn" onClick={handleLogout}>
          退出登录
        </button>
      </div>
    </header>
  );
};

export default Header;