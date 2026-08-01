export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface NetworkStats {
  latency: number;
  downloadSpeed: number;
  uploadSpeed: number;
  quality: NetworkQuality;
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
}

export interface NetworkQualityConfig {
  sampleCount: number;
  sampleInterval: number;
  excellentThreshold: number;
  goodThreshold: number;
  fairThreshold: number;
}

const DEFAULT_CONFIG: NetworkQualityConfig = {
  sampleCount: 5,
  sampleInterval: 5000,
  excellentThreshold: 5000000,
  goodThreshold: 1000000,
  fairThreshold: 256000,
};

export class NetworkQualityService {
  private static instance: NetworkQualityService;
  private config: NetworkQualityConfig;
  private latencySamples: number[] = [];
  private speedSamples: number[] = [];
  private currentStats: NetworkStats;
  private listeners: Set<(stats: NetworkStats) => void> = new Set();
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private lastOnlineStatus = true;

  private constructor(config: NetworkQualityConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.currentStats = this.createInitialStats();
    this.startMonitoring();
  }

  public static getInstance(config?: NetworkQualityConfig): NetworkQualityService {
    if (!NetworkQualityService.instance) {
      NetworkQualityService.instance = new NetworkQualityService(config);
    }
    return NetworkQualityService.instance;
  }

  private createInitialStats(): NetworkStats {
    return {
      latency: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      quality: this.detectInitialQuality(),
      isOnline: navigator.onLine,
      connectionType: this.detectConnectionType(),
    };
  }

  private detectInitialQuality(): NetworkQuality {
    if (!navigator.onLine) return 'offline';
    return 'good';
  }

  private detectConnectionType(): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    if ('connection' in navigator) {
      const conn = navigator.connection as { effectiveType?: string };
      const effectiveType = conn.effectiveType;
      switch (effectiveType) {
        case '4g':
        case '3g':
          return 'cellular';
        case '2g':
          return 'cellular';
        case 'wifi':
          return 'wifi';
        default:
          return 'unknown';
      }
    }
    return 'unknown';
  }

  private startMonitoring(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    if ('connection' in navigator) {
      (navigator.connection as EventTarget).addEventListener('change', this.handleConnectionChange);
    }

    this.monitorInterval = setInterval(() => {
      void this.measureNetworkQuality();
    }, this.config.sampleInterval);

    void this.measureNetworkQuality();
  }

  private handleOnline = () => {
    this.lastOnlineStatus = true;
    this.currentStats.isOnline = true;
    void this.measureNetworkQuality();
  };

  private handleOffline = () => {
    this.lastOnlineStatus = false;
    this.currentStats.isOnline = false;
    this.currentStats.quality = 'offline';
    this.notifyListeners();
  };

  private handleConnectionChange = () => {
    this.currentStats.connectionType = this.detectConnectionType();
    void this.measureNetworkQuality();
  };

  private async measureNetworkQuality(): Promise<void> {
    if (!navigator.onLine) {
      this.currentStats.quality = 'offline';
      this.notifyListeners();
      return;
    }

    const [latency, speed] = await Promise.all([
      this.measureLatency(),
      this.measureSpeed(),
    ]);

    this.latencySamples.push(latency);
    this.speedSamples.push(speed);

    if (this.latencySamples.length > this.config.sampleCount) {
      this.latencySamples.shift();
    }
    if (this.speedSamples.length > this.config.sampleCount) {
      this.speedSamples.shift();
    }

    const avgLatency = this.calculateAverage(this.latencySamples);
    const avgSpeed = this.calculateAverage(this.speedSamples);

    this.currentStats.latency = avgLatency;
    this.currentStats.downloadSpeed = avgSpeed;
    this.currentStats.quality = this.calculateQuality(avgSpeed);

    this.notifyListeners();
  }

  private async measureLatency(): Promise<number> {
    const startTime = performance.now();
    try {
      await fetch('data:,', { cache: 'no-store' });
      return performance.now() - startTime;
    } catch {
      return 1000;
    }
  }

  private async measureSpeed(): Promise<number> {
    const startTime = performance.now();
    const testUrl = 'https://www.google.com/favicon.ico';

    try {
      const response = await fetch(testUrl, { cache: 'no-store' });
      const blob = await response.blob();
      const duration = (performance.now() - startTime) / 1000;

      if (duration > 0 && blob.size > 0) {
        return (blob.size * 8) / duration;
      }
    } catch {
      return 0;
    }

    return 0;
  }

  private calculateAverage(samples: number[]): number {
    if (samples.length === 0) return 0;
    return samples.reduce((sum, val) => sum + val, 0) / samples.length;
  }

  private calculateQuality(speedBps: number): NetworkQuality {
    if (!navigator.onLine) return 'offline';
    if (speedBps >= this.config.excellentThreshold) return 'excellent';
    if (speedBps >= this.config.goodThreshold) return 'good';
    if (speedBps >= this.config.fairThreshold) return 'fair';
    return 'poor';
  }

  public getStats(): NetworkStats {
    return { ...this.currentStats };
  }

  public getQuality(): NetworkQuality {
    return this.currentStats.quality;
  }

  public isOnline(): boolean {
    return this.currentStats.isOnline;
  }

  public getConnectionType(): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    return this.currentStats.connectionType;
  }

  public addListener(listener: (stats: NetworkStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentStats));
  }

  public getRecommendedConcurrentDownloads(): number {
    switch (this.currentStats.quality) {
      case 'excellent':
        return 5;
      case 'good':
        return 3;
      case 'fair':
        return 2;
      case 'poor':
        return 1;
      case 'offline':
        return 0;
    }
  }

  public getRecommendedSpeedLimit(): number {
    if (!this.currentStats.isOnline) return 0;

    const speedBytes = this.currentStats.downloadSpeed / 8;

    switch (this.currentStats.quality) {
      case 'excellent':
        return Math.floor(speedBytes * 0.8);
      case 'good':
        return Math.floor(speedBytes * 0.6);
      case 'fair':
        return Math.floor(speedBytes * 0.4);
      case 'poor':
        return Math.floor(speedBytes * 0.2);
      case 'offline':
        return 0;
    }
  }

  public isConnectionStable(): boolean {
    if (!this.currentStats.isOnline) return false;
    if (this.currentStats.quality === 'poor') return false;
    if (this.currentStats.latency > 500) return false;
    return true;
  }

  public stopMonitoring(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    if ('connection' in navigator) {
      (navigator.connection as EventTarget).removeEventListener('change', this.handleConnectionChange);
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  public resumeMonitoring(): void {
    if (!this.monitorInterval) {
      this.startMonitoring();
    }
  }
}