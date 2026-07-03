import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import NotificationPanel from '../NotificationPanel';
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

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, theme, setTheme } = useAppStore();

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
    if (theme === 'dark') return '深色';
    if (theme === 'light') return '浅色';
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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-700">
            下载管理系统
          </h1>
          <Badge variant="secondary" className="ml-1">
            v2.0
          </Badge>
        </div>
        <p className="ml-11 text-sm text-gray-500">高效管理文件下载与上传任务</p>
      </div>

      <div className="flex items-center gap-3">
        <NotificationPanel />

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
            <p>当前主题: {getThemeLabel()}</p>
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
              个人中心
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void navigate('/settings')}>
              <span className="mr-2">⚙️</span>
              设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-error-600">
              <span className="mr-2">🚪</span>
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
