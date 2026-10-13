import React, { useState, useEffect } from 'react';
import { Progress, Tooltip, TooltipTrigger, TooltipContent } from './ui/shadcn';
import { formatBytes } from '../utils/format';
import SocketService from '../services/socketService';

interface DiskUsage {
  available: string;
  total: string;
  free: string;
  used: string;
  percent: number;
}

interface DiskUsageWidgetProps {
  collapsed?: boolean;
}

const DiskUsageWidget: React.FC<DiskUsageWidgetProps> = ({ collapsed }) => {
  const [usage, setUsage] = useState<DiskUsage | null>(null);

  useEffect(() => {
    const socketService = SocketService.getInstance();
    const unsubscribe = socketService.onDiskUsage((data) => {
      setUsage(data);
    });

    return () => unsubscribe();
  }, []);

  if (!usage) return null;

  const isWarning = usage.percent > 85;
  const isCritical = usage.percent > 95;

  const content = (
    <div className={`space-y-2 p-2 rounded-lg transition-colors ${
      isCritical ? 'bg-red-50' : isWarning ? 'bg-yellow-50' : 'bg-gray-50'
    }`}>
      {!collapsed && (
        <div className="flex justify-between text-[10px] font-medium text-gray-500 uppercase tracking-wider">
          <span>磁盘空间</span>
          <span className={isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : ''}>
            {usage.percent}%
          </span>
        </div>
      )}
      
      <Progress 
        value={usage.percent} 
        className={`h-1.5 ${collapsed ? 'w-full' : ''}`}
        // 这里的 Progress 组件如果不支持颜色自定义，可能需要包裹一层
      />

      {!collapsed && (
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{formatBytes(Number(usage.used))}</span>
          <span>共 {formatBytes(Number(usage.total))}</span>
        </div>
      )}

      {isCritical && !collapsed && (
        <div className="text-[9px] text-red-500 font-bold animate-pulse">
          ⚠️ 磁盘空间极低
        </div>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-2 py-4 cursor-help">
            <div className="relative h-12 w-1.5 mx-auto bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`absolute bottom-0 w-full transition-all duration-500 ${
                  isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ height: `${usage.percent}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-xs space-y-1">
            <p className="font-bold">磁盘占用: {usage.percent}%</p>
            <p>已用: {formatBytes(Number(usage.used))}</p>
            <p>可用: {formatBytes(Number(usage.available))}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

export default DiskUsageWidget;
