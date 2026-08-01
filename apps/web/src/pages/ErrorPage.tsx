import React from 'react';

const ErrorPage: React.FC = () => {
  return (
    <div className="error-page">
      <div className="error-content">
        <span className="error-icon">❌</span>
        <h2 className="error-title">页面未找到</h2>
        <p className="error-desc">您访问的页面不存在或已被移除</p>
        <a href="/" className="error-link">
          返回首页
        </a>
      </div>
    </div>
  );
};

export default ErrorPage;