import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import ErrorBoundary from '../ErrorBoundary';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { Breadcrumb } from '../ui';

const Layout: React.FC = () => {
  const location = useLocation();

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
    <div className="flex min-h-screen bg-gray-50">
      <ErrorBoundary>
        <Sidebar />
        
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          
          <div className="border-b border-gray-200 bg-white px-6 py-3">
            <Breadcrumb items={getBreadcrumbItems()} />
          </div>
          
          <main className="flex-1 overflow-y-auto p-6">
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
