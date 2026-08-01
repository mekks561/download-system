import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import NotificationPanel from '../NotificationPanel';
import LanguageSwitcher from '../LanguageSwitcher';
import {
  Button,
  Avatar,
  AvatarFallback,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../ui/shadcn';
import { useTranslation } from 'react-i18next';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, theme, setTheme, toggleMobileMenu } = useAppStore();
  const { t } = useTranslation();

  const handleLogout = () => {
    void logout();
    void navigate('/login');
  };

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeLabel = () => {
    if (theme === 'dark') return t('settings.darkTheme');
    if (theme === 'light') return t('settings.lightTheme');
    return '跟随系统';
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return '🌙';
    if (theme === 'light') return '☀️';
    return '🔄';
  };

  const getUserInitial = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'G';
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-pink-100 bg-white/70 backdrop-blur-md px-4 md:px-6 shadow-sm kawaii-shadow">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          className="md:hidden lg:hidden xl:hidden"
        >
          <span className="text-lg">☰</span>
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl float-animation">📥</span>
            <h1 className="text-sm md:text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              {t('app.title')}
            </h1>
            <span className="text-sm md:text-lg bounce-soft hidden sm:block">🌸</span>
            <Badge variant="secondary" className="ml-1 bg-pink-100 text-pink-700 hover:bg-pink-200">
              v2.0
            </Badge>
          </div>
          <p className="ml-7 md:ml-11 text-xs md:text-sm text-gray-500 hidden sm:block">✨ {t('app.subtitle')} ✨</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationPanel />
        <LanguageSwitcher />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              <span className="text-lg">{getThemeIcon()}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('settings.theme')}: {getThemeLabel()}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-500 text-white">
                  {getUserInitial()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">
                {user?.username || 'Guest'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary-500 text-white">
                  {getUserInitial()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium text-gray-700">
                  {user?.username || 'Guest'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void navigate('/profile')}>
              <span className="mr-2">👤</span>
              {t('nav.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void navigate('/settings')}>
              <span className="mr-2">⚙️</span>
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-error-600">
              <span className="mr-2">🚪</span>
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
