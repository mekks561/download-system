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
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useAppStore();

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
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 z-30 md:hidden lg:hidden xl:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>
      <aside
        className={`flex flex-col border-r border-pink-100 bg-white/80 backdrop-blur-md transition-all duration-300 kawaii-shadow ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        } md:fixed md:top-0 md:left-0 md:h-screen ${
          mobileMenuOpen ? 'fixed top-0 left-0 h-screen w-64 z-40' : 'fixed top-0 left-[-100%]'
        } md:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-center border-b border-pink-100 px-3 relative overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void toggleSidebar();
              setMobileMenuOpen(false);
            }}
            className="w-full"
          >
            <span className="text-lg">{sidebarCollapsed ? '▶' : '◀'}</span>
          </Button>
          {!sidebarCollapsed && (
            <span className="absolute top-2 right-2 text-lg bounce-soft">💖</span>
          )}
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

      <div className="border-t border-pink-100 p-3">
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
    </>
  );
};

export default Sidebar;
