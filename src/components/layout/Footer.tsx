import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-pink-100 bg-white/60 backdrop-blur-md py-4 px-6">
      <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
        <p>下载管理系统 v2.0 - 支持断点续传、多任务管理、数据统计</p>
        
      </div>
    </footer>
  );
};

export default Footer;
