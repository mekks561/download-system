import { useState, useEffect } from 'react';
import { NetworkQualityService, NetworkStats, NetworkQuality } from '../services/NetworkQualityService';

export interface UseNetworkStatusReturn {
  stats: NetworkStats;
  quality: NetworkQuality;
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  recommendedConcurrentDownloads: number;
  recommendedSpeedLimit: number;
  isStable: boolean;
  latency: number;
  downloadSpeed: number;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [stats, setStats] = useState<NetworkStats>(() => {
    return NetworkQualityService.getInstance().getStats();
  });

  const networkService = NetworkQualityService.getInstance();

  useEffect(() => {
    const unsubscribe = networkService.addListener(setStats);
    return unsubscribe;
  }, [networkService]);

  const quality = stats.quality;
  const isOnline = stats.isOnline;
  const connectionType = stats.connectionType;
  const latency = stats.latency;
  const downloadSpeed = stats.downloadSpeed;

  const recommendedConcurrentDownloads = networkService.getRecommendedConcurrentDownloads();
  const recommendedSpeedLimit = networkService.getRecommendedSpeedLimit();
  const isStable = networkService.isConnectionStable();

  return {
    stats,
    quality,
    isOnline,
    connectionType,
    recommendedConcurrentDownloads,
    recommendedSpeedLimit,
    isStable,
    latency,
    downloadSpeed,
  };
}

export default useNetworkStatus;