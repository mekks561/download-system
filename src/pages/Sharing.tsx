import React, { useState } from 'react';
import ShareManager from '../components/ShareManager';

const Sharing: React.FC = () => {
  const [isManagerOpen, setIsManagerOpen] = useState(true);

  return (
    <div className="sharing-page">
      <div className="page-header">
        <h2 className="page-title">🔗 文件分享</h2>
        <p className="page-desc">创建分享链接，管理文件分享权限</p>
      </div>
      <ShareManager 
        isOpen={isManagerOpen} 
        onClose={() => setIsManagerOpen(false)} 
      />
    </div>
  );
};

export default Sharing;