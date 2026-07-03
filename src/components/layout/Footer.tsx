import React from 'react';
import { Separator } from '../ui/shadcn';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 bg-white py-4 px-6">
      <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
        <p>下载管理系统 v2.0 - 支持断点续传、多任务管理、数据统计</p>
        <div className="flex items-center gap-2">
          <span>© 2024 Download Manager</span>
          <Separator orientation="vertical" className="h-4" />
          <span>基于 React + TypeScript</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
