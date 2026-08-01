import React, { useState } from 'react';
import ScheduleManager from '../components/ScheduleManager';

const Schedule: React.FC = () => {
  const [isManagerOpen, setIsManagerOpen] = useState(true);

  return (
    <div className="schedule-page">
      <div className="page-header">
        <h2 className="page-title">⏰ 调度管理</h2>
        <p className="page-desc">创建和管理定时下载任务</p>
      </div>
      <ScheduleManager 
        isOpen={isManagerOpen} 
        onClose={() => setIsManagerOpen(false)} 
      />
    </div>
  );
};

export default Schedule;