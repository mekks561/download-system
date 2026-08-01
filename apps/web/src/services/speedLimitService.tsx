import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type SpeedLimitUnit = 'KB/s' | 'MB/s';

export interface SpeedLimitConfig {
  enabled: boolean;
  limit: number;
  unit: SpeedLimitUnit;
}

interface SpeedLimitContextType {
  config: SpeedLimitConfig;
  setConfig: (config: SpeedLimitConfig) => void;
  getBytesPerSecond: () => number;
}

const SpeedLimitContext = createContext<SpeedLimitContextType | undefined>(undefined);

const STORAGE_KEY = 'speedLimitConfig';

const defaultConfig: SpeedLimitConfig = {
  enabled: false,
  limit: 100,
  unit: 'KB/s',
};

export function SpeedLimitProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SpeedLimitConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SpeedLimitConfig;
        if (parsed.enabled !== undefined) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return defaultConfig;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback((newConfig: SpeedLimitConfig) => {
    setConfig(newConfig);
  }, []);

  const getBytesPerSecond = useCallback(() => {
    if (!config.enabled) return 0;
    const multiplier = config.unit === 'KB/s' ? 1024 : 1024 * 1024;
    return config.limit * multiplier;
  }, [config]);

  const contextValue = { config, setConfig: updateConfig, getBytesPerSecond };

  return (
    <SpeedLimitContext value={contextValue}>
      {children}
    </SpeedLimitContext>
  );
}

export const useSpeedLimit = () => {
  const context = useContext(SpeedLimitContext);
  if (!context) {
    throw new Error('useSpeedLimit must be used within a SpeedLimitProvider');
  }
  return context;
};

export const speedLimitService = {
  load: (): SpeedLimitConfig => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as SpeedLimitConfig) : defaultConfig;
    } catch {
      return defaultConfig;
    }
  },
  save: (config: SpeedLimitConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  },
  toBytesPerSecond: (config: SpeedLimitConfig): number => {
    if (!config.enabled) return 0;
    const multiplier = config.unit === 'KB/s' ? 1024 : 1024 * 1024;
    return config.limit * multiplier;
  },
};

export const PRESET_LIMITS = [
  { label: '无限制', limit: 0, unit: 'KB/s' as SpeedLimitUnit },
  { label: '50 KB/s', limit: 50, unit: 'KB/s' as SpeedLimitUnit },
  { label: '100 KB/s', limit: 100, unit: 'KB/s' as SpeedLimitUnit },
  { label: '256 KB/s', limit: 256, unit: 'KB/s' as SpeedLimitUnit },
  { label: '512 KB/s', limit: 512, unit: 'KB/s' as SpeedLimitUnit },
  { label: '1 MB/s', limit: 1, unit: 'MB/s' as SpeedLimitUnit },
  { label: '2 MB/s', limit: 2, unit: 'MB/s' as SpeedLimitUnit },
  { label: '5 MB/s', limit: 5, unit: 'MB/s' as SpeedLimitUnit },
  { label: '10 MB/s', limit: 10, unit: 'MB/s' as SpeedLimitUnit },
];
