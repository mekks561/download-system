import React from 'react';
import { Wifi, WifiOff, Signal, Battery } from 'lucide-react';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { OfflineDownloadService } from '../services/OfflineDownloadService';

interface OfflineIndicatorProps {
  compact?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ compact = false }) => {
  const { isOnline, quality, connectionType, latency, downloadSpeed } = useNetworkStatus();
  const offlineService = OfflineDownloadService.getInstance();
  const queueStats = offlineService.getQueueStats();

  const qualityColors = {
    excellent: 'bg-green-500',
    good: 'bg-green-400',
    fair: 'bg-yellow-400',
    poor: 'bg-orange-500',
    offline: 'bg-red-500',
  };

  const qualityLabels = {
    excellent: '网络极佳',
    good: '网络良好',
    fair: '网络一般',
    poor: '网络较差',
    offline: '网络离线',
  };

  const connectionLabels = {
    wifi: 'Wi-Fi',
    cellular: '蜂窝数据',
    ethernet: '以太网',
    unknown: '未知',
  };

  const formatSpeed = (bps: number): string => {
    if (bps < 1000) return `${bps} bps`;
    if (bps < 1000000) return `${(bps / 1000).toFixed(0)} kbps`;
    return `${(bps / 1000000).toFixed(1)} Mbps`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
        isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}>
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span>{qualityLabels[quality]}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${
      isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {isOnline ? (
          <Wifi className="w-5 h-5 text-green-600" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-600" />
        )}
        <span className={`font-semibold ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
          {qualityLabels[quality]}
        </span>
        <span className={`w-2 h-2 rounded-full ${qualityColors[quality]}`} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Signal className="w-4 h-4" />
          <span>{connectionLabels[connectionType]}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Battery className="w-4 h-4" />
          <span>{formatSpeed(downloadSpeed)}</span>
        </div>
        <div className="text-gray-500">
          延迟: {latency.toFixed(0)}ms
        </div>
        <div className="text-gray-500">
          队列: {queueStats.waiting} 等待
        </div>
      </div>

      {!isOnline && queueStats.waiting > 0 && (
        <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-600">
          💡 {queueStats.waiting} 个下载任务等待网络恢复后继续
        </div>
      )}

      {isOnline && quality === 'poor' && (
        <div className="mt-2 pt-2 border-t border-orange-200 text-xs text-orange-600">
          ⚠️ 网络质量较差，建议检查网络连接
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;