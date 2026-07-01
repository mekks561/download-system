import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import LanguageSwitcher from '../LanguageSwitcher';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  const navItems: NavItem[] = [
    { path: '/', icon: '🏠', labelKey: 'nav.home' },
    { path: '/downloads', icon: '📥', labelKey: 'nav.downloads' },
    { path: '/uploads', icon: '📤', labelKey: 'nav.uploads' },
    { path: '/files', icon: '📁', labelKey: 'nav.files' },
    { path: '/stats', icon: '📊', labelKey: 'nav.stats' },
    { path: '/schedule', icon: '⏰', labelKey: 'nav.schedule' },
    { path: '/sharing', icon: '🔗', labelKey: 'nav.sharing' },
    { path: '/history', icon: '📜', labelKey: 'nav.history' },
    { path: '/settings', icon: '⚙️', labelKey: 'nav.settings' },
    { path: '/profile', icon: '👤', labelKey: 'nav.profile' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="sidebar-toggle" onClick={() => void toggleSidebar()}>
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNavigate(item.path)}
            title={sidebarCollapsed ? t(item.labelKey) : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!sidebarCollapsed && <span className="nav-label">{t(item.labelKey)}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!sidebarCollapsed && <LanguageSwitcher />}
        <div className="sidebar-version">
          {!sidebarCollapsed && <span>v2.0</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;