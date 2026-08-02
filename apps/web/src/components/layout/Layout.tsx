import React from 'react';
import { Outlet, useLocation } from 'react-router';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import ErrorBoundary from '../ErrorBoundary';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { Breadcrumb } from '../ui';
import { useAppStore } from '../../store';

const Layout: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed } = useAppStore();

  const getBreadcrumbItems = () => {
    const pathname = location.pathname;
    const paths = pathname.split('/').filter(p => p);
    
    const items = [{ title: '首页', href: '/' }];
    
    const routeMap: { [key: string]: string } = {
      downloads: '下载管理',
      uploads: '上传管理',
      stats: '统计分析',
      schedule: '定时任务',
      sharing: '分享管理',
      history: '历史记录',
      settings: '设置中心',
      files: '文件管理',
      profile: '个人中心',
    };

    let currentPath = '';
    paths.forEach((path) => {
      currentPath += `/${path}`;
      items.push({
        title: routeMap[path] || path,
        href: currentPath,
      });
    });

    return items;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/6 right-1/6 w-48 h-48 bg-rose-200/20 rounded-full blur-2xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-sky-200/20 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
        
        <div className="absolute top-1/4 left-1/4 text-4xl opacity-10 float-animation">🌸</div>
        <div className="absolute top-1/3 right-1/4 text-3xl opacity-10 float-animation-delay-1">✨</div>
        <div className="absolute bottom-1/4 left-1/5 text-3xl opacity-10 float-animation-delay-2">🦄</div>
        <div className="absolute bottom-1/3 right-1/3 text-3xl opacity-10 float-animation-delay-3">💫</div>
        <div className="absolute top-1/2 left-1/2 text-2xl opacity-10 sparkle-animation">🌈</div>
        <div className="absolute top-1/4 right-1/3 text-2xl opacity-10 sparkle-animation" style={{animationDelay: '0.7s'}}>⭐</div>
        <div className="absolute top-1/5 left-1/3 text-3xl opacity-10 bounce-soft">💖</div>
        <div className="absolute top-1/6 left-1/2 text-xl opacity-5 sparkle-animation">✨</div>
        <div className="absolute bottom-1/3 left-1/3 text-xl opacity-5 sparkle-animation" style={{animationDelay: '0.8s'}}>⭐</div>

        <div className="absolute top-1/4 right-1/6 text-6xl opacity-5 float-animation">☁️</div>
        <div className="absolute bottom-1/4 left-1/6 text-5xl opacity-5 float-animation-delay-1">☁️</div>
        <div className="absolute top-1/2 right-1/3 text-4xl opacity-5 float-animation-delay-2">☁️</div>
      </div>
      
      <ErrorBoundary>
        <Sidebar />
        
        <div className={`flex flex-col overflow-hidden relative z-10 md:flex md:flex-1 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>
          <Header />
          
          <div className="border-b border-pink-100 bg-white/60 backdrop-blur-md px-3 md:px-6 py-2 md:py-3">
            <Breadcrumb items={getBreadcrumbItems()} />
          </div>
          
          <main className="flex-1 overflow-y-auto p-3 md:p-6">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
          
          <Footer />
        </div>
        
        <PerformanceMonitor />
      </ErrorBoundary>
    </div>
  );
};

export default Layout;
