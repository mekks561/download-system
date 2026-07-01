import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <p>下载管理系统 v2.0 - 支持断点续传、多任务管理、数据统计</p>
      <p className="footer-links">
        <span>© 2024 Download Manager</span>
        <span>|</span>
        <span>基于 React + TypeScript</span>
      </p>
    </footer>
  );
};

export default Footer;