import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from './ui';

const NAV_ITEMS = [
  { to: '/', label: '数据概览', end: true },
  { to: '/users', label: '用户管理', end: false },
  { to: '/downloads', label: '下载审计', end: false },
  { to: '/plugins', label: '插件管理', end: false },
  { to: '/activities', label: '活动审计', end: false },
  { to: '/governance', label: '资源治理', end: false },
  { to: '/settings', label: '系统设置', end: false },
];

/** 左侧导航 + 顶部账号栏的后台布局（登录页不进此布局） */
const Layout: React.FC = () => {
  const { gmUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    void navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h1 className="text-lg font-semibold text-gray-900">GM 管理后台</h1>
          <p className="mt-0.5 text-xs text-gray-500">Download Manager</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <span className="text-sm text-gray-600">
            当前账号：<span className="font-medium text-gray-900">{gmUser?.username}</span>
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            退出登录
          </Button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
