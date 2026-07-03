import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import LanguageSwitcher from '../LanguageSwitcher';
import { Button, Tooltip, TooltipTrigger, TooltipContent, Separator } from '../ui/shadcn';

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
    void navigate(path);
  };

  return (
    <aside
      className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-16 items-center justify-center border-b border-gray-200 px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void toggleSidebar()}
          className="w-full"
        >
          <span className="text-lg">{sidebarCollapsed ? '▶' : '◀'}</span>
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const navButton = (
            <Button
              key={item.path}
              variant={isActive ? 'default' : 'ghost'}
              className={`w-full justify-start gap-3 ${
                sidebarCollapsed ? 'justify-center px-0' : ''
              }`}
              onClick={() => handleNavigate(item.path)}
            >
              <span className="text-lg">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="text-sm">{t(item.labelKey)}</span>
              )}
            </Button>
          );

          if (sidebarCollapsed) {
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t(item.labelKey)}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return navButton;
        })}
      </nav>

      <div className="border-t border-gray-200 p-3">
        {!sidebarCollapsed && (
          <>
            <LanguageSwitcher />
            <Separator className="my-3" />
          </>
        )}
        <div className="text-center text-xs text-gray-500">
          {!sidebarCollapsed && <span>v2.0</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
