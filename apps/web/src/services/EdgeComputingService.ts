import { NetworkQualityService } from './NetworkQualityService';

export type EdgeComputingMode = 'auto' | 'performance' | 'battery_saver' | 'offline_first';

export interface EdgeComputingStats {
  mode: EdgeComputingMode;
  availableMemory: number;
  usedMemory: number;
  cpuUsage: number;
  batteryLevel: number;
  isLowPowerMode: boolean;
  networkQuality: ReturnType<NetworkQualityService['getQuality']>;
  concurrentDownloads: number;
  adaptiveSpeedLimit: number;
  isWasmSupported: boolean;
  wasmModulesLoaded: string[];
}

export interface LocalModel {
  id: string;
  name: string;
  version: string;
  size: number;
  type: 'classification' | 'summarization' | 'recommendation';
  loaded: boolean;
  lastUsed: number;
}

export interface NetworkProfile {
  id: string;
  name: string;
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  quality: ReturnType<NetworkQualityService['getQuality']>;
  maxConcurrentDownloads: number;
  speedLimit: number;
  autoResume: boolean;
  createdAt: number;
}

export class EdgeComputingService {
  private static instance: EdgeComputingService;
  private mode: EdgeComputingMode = 'auto';
  private networkService: NetworkQualityService;
  private wasmModules: Map<string, WebAssembly.Module> = new Map();
  private localModels: Map<string, LocalModel> = new Map();
  private networkProfiles: Map<string, NetworkProfile> = new Map();
  private listeners: Set<(stats: EdgeComputingStats) => void> = new Set();
  private statsUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private batteryLevel = 1;
  private isLowPowerMode = false;

  private constructor() {
    this.networkService = NetworkQualityService.getInstance();
    this.loadNetworkProfiles();
    this.setupBatteryListener();
    this.startStatsUpdate();
  }

  public static getInstance(): EdgeComputingService {
    if (!EdgeComputingService.instance) {
      EdgeComputingService.instance = new EdgeComputingService();
    }
    return EdgeComputingService.instance;
  }

  private setupBatteryListener(): void {
    if ('getBattery' in navigator) {
      (navigator as unknown as { getBattery: () => Promise<{ level: number; charging: boolean; addEventListener: (event: string, handler: () => void) => void }> })
        .getBattery()
        .then((battery) => {
          this.batteryLevel = battery.level;
          this.isLowPowerMode = battery.level < 0.2 && !battery.charging;

          battery.addEventListener('levelchange', () => {
            this.batteryLevel = battery.level;
            this.isLowPowerMode = battery.level < 0.2 && !battery.charging;
            this.notifyListeners();
          });

          battery.addEventListener('chargingchange', () => {
            this.isLowPowerMode = battery.level < 0.2 && !battery.charging;
            this.notifyListeners();
          });
        })
        .catch(() => {
          this.batteryLevel = 1;
          this.isLowPowerMode = false;
        });
    }
  }

  private loadNetworkProfiles(): void {
    try {
      const stored = localStorage.getItem('edge_network_profiles');
      if (stored) {
        const profiles = JSON.parse(stored) as NetworkProfile[];
        profiles.forEach((profile) => {
          this.networkProfiles.set(profile.id, profile);
        });
      } else {
        this.initializeDefaultProfiles();
      }
    } catch {
      this.initializeDefaultProfiles();
    }
  }

  private initializeDefaultProfiles(): void {
    const defaultProfiles: NetworkProfile[] = [
      {
        id: 'profile_wifi',
        name: 'WiFi',
        type: 'wifi',
        quality: 'excellent',
        maxConcurrentDownloads: 5,
        speedLimit: 0,
        autoResume: true,
        createdAt: Date.now(),
      },
      {
        id: 'profile_cellular',
        name: '移动网络',
        type: 'cellular',
        quality: 'good',
        maxConcurrentDownloads: 2,
        speedLimit: 2 * 1024 * 1024,
        autoResume: true,
        createdAt: Date.now(),
      },
      {
        id: 'profile_poor',
        name: '弱网络',
        type: 'unknown',
        quality: 'poor',
        maxConcurrentDownloads: 1,
        speedLimit: 512 * 1024,
        autoResume: false,
        createdAt: Date.now(),
      },
    ];

    defaultProfiles.forEach((profile) => {
      this.networkProfiles.set(profile.id, profile);
    });
    this.saveNetworkProfiles();
  }

  private saveNetworkProfiles(): void {
    try {
      const profiles = Array.from(this.networkProfiles.values());
      localStorage.setItem('edge_network_profiles', JSON.stringify(profiles));
    } catch {
      // ignore
    }
  }

  private startStatsUpdate(): void {
    this.statsUpdateInterval = setInterval(() => {
      this.notifyListeners();
    }, 5000);
  }

  public setMode(mode: EdgeComputingMode): void {
    this.mode = mode;
    this.notifyListeners();
  }

  public getMode(): EdgeComputingMode {
    return this.mode;
  }

  public getStats(): EdgeComputingStats {
    const usedMemory = this.wasmModules.size * 1024 * 1024;
    const availableMemory = this.getAvailableMemory();

    return {
      mode: this.mode,
      availableMemory,
      usedMemory,
      cpuUsage: this.getCPUUsage(),
      batteryLevel: this.batteryLevel,
      isLowPowerMode: this.isLowPowerMode,
      networkQuality: this.networkService.getQuality(),
      concurrentDownloads: this.getRecommendedConcurrentDownloads(),
      adaptiveSpeedLimit: this.getAdaptiveSpeedLimit(),
      isWasmSupported: this.isWasmSupported(),
      wasmModulesLoaded: Array.from(this.wasmModules.keys()),
    };
  }

  private getAvailableMemory(): number {
    if ('memory' in performance) {
      const memoryInfo = performance.memory as { totalJSHeapSize: number; usedJSHeapSize: number; jsHeapSizeLimit: number };
      return memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize;
    }
    return 512 * 1024 * 1024;
  }

  private getCPUUsage(): number {
    if ('getEntriesByType' in performance) {
      const entries = performance.getEntriesByType('measure');
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1] as { duration: number };
        return Math.min(lastEntry.duration / 16.67, 100);
      }
    }
    return 0;
  }

  public isWasmSupported(): boolean {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  }

  public async loadWasmModule(name: string, wasmBytes: Uint8Array): Promise<WebAssembly.Instance | null> {
    if (!this.isWasmSupported()) {
      return null;
    }

    try {
      const module = await WebAssembly.compile(wasmBytes as unknown as BufferSource);
      this.wasmModules.set(name, module);

      const importObject = {
        env: {
          memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
          table: new WebAssembly.Table({ initial: 0, maximum: 0, element: 'anyfunc' }),
        },
      };

      const instance = await WebAssembly.instantiate(module, importObject);
      this.notifyListeners();
      return instance;
    } catch {
      return null;
    }
  }

  public unloadWasmModule(name: string): void {
    this.wasmModules.delete(name);
    this.notifyListeners();
  }

  public getWasmModule(name: string): WebAssembly.Module | undefined {
    return this.wasmModules.get(name);
  }

  public loadLocalModel(model: Omit<LocalModel, 'loaded' | 'lastUsed'>): boolean {
    if (!this.isWasmSupported()) {
      return false;
    }

    try {
      const localModel: LocalModel = {
        ...model,
        loaded: true,
        lastUsed: Date.now(),
      };
      this.localModels.set(model.id, localModel);
      this.notifyListeners();
      return true;
    } catch {
      return false;
    }
  }

  public unloadLocalModel(modelId: string): void {
    this.localModels.delete(modelId);
    this.notifyListeners();
  }

  public getLocalModel(modelId: string): LocalModel | undefined {
    return this.localModels.get(modelId);
  }

  public getLocalModels(): LocalModel[] {
    return Array.from(this.localModels.values());
  }

  public runLocalInference(modelId: string, input: string): string | null {
    const model = this.localModels.get(modelId);
    if (!model || !model.loaded) {
      return null;
    }

    try {
      model.lastUsed = Date.now();
      this.notifyListeners();

      switch (model.type) {
        case 'classification':
          return this.runClassificationInference(input);
        case 'summarization':
          return this.runSummarizationInference(input);
        case 'recommendation':
          return this.runRecommendationInference(input);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private runClassificationInference(input: string): string {
    const extension = input.split('.').pop()?.toLowerCase() || '';

    const categoryMap: Record<string, string> = {
      pdf: 'documents',
      doc: 'documents',
      docx: 'documents',
      xls: 'documents',
      xlsx: 'documents',
      ppt: 'documents',
      pptx: 'documents',
      txt: 'documents',
      md: 'documents',
      csv: 'documents',
      jpg: 'images',
      jpeg: 'images',
      png: 'images',
      gif: 'images',
      svg: 'images',
      webp: 'images',
      mp4: 'videos',
      mov: 'videos',
      avi: 'videos',
      mkv: 'videos',
      mp3: 'audio',
      wav: 'audio',
      flac: 'audio',
      exe: 'software',
      dmg: 'software',
      apk: 'software',
      zip: 'archives',
      rar: 'archives',
      '7z': 'archives',
    };

    const category = categoryMap[extension] || 'other';
    return JSON.stringify({ category, confidence: 0.9 });
  }

  private runSummarizationInference(input: string): string {
    const maxLength = Math.min(input.length, 100);
    const summary = input.substring(0, maxLength) + (input.length > maxLength ? '...' : '');
    return JSON.stringify({ summary, confidence: 0.7 });
  }

  private runRecommendationInference(_input: string): string {
    return JSON.stringify({ recommendations: [], confidence: 0.5 });
  }

  public getRecommendedConcurrentDownloads(): number {
    const quality = this.networkService.getQuality();
    const connectionType = this.networkService.getConnectionType();

    const profile = Array.from(this.networkProfiles.values()).find(
      (p) => p.type === connectionType && p.quality === quality
    );

    if (profile) {
      return profile.maxConcurrentDownloads;
    }

    switch (this.mode) {
      case 'performance':
        switch (quality) {
          case 'excellent':
            return 8;
          case 'good':
            return 5;
          case 'fair':
            return 3;
          case 'poor':
            return 1;
          case 'offline':
            return 0;
          default:
            return 3;
        }
      case 'battery_saver':
        return 1;
      case 'offline_first':
        return this.networkService.isOnline() ? 2 : 0;
      case 'auto':
      default:
        if (this.isLowPowerMode) {
          return 1;
        }
        switch (quality) {
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
  }

  public getAdaptiveSpeedLimit(): number {
    const quality = this.networkService.getQuality();
    const connectionType = this.networkService.getConnectionType();

    const profile = Array.from(this.networkProfiles.values()).find(
      (p) => p.type === connectionType && p.quality === quality
    );

    if (profile && profile.speedLimit > 0) {
      return profile.speedLimit;
    }

    const baseLimit = this.networkService.getRecommendedSpeedLimit();

    switch (this.mode) {
      case 'performance':
        return baseLimit;
      case 'battery_saver':
        return Math.floor(baseLimit * 0.3);
      case 'offline_first':
        return this.networkService.isOnline() ? Math.floor(baseLimit * 0.5) : 0;
      case 'auto':
      default:
        if (this.isLowPowerMode) {
          return Math.floor(baseLimit * 0.5);
        }
        return baseLimit;
    }
  }

  public shouldAutoResume(): boolean {
    const quality = this.networkService.getQuality();
    const connectionType = this.networkService.getConnectionType();

    const profile = Array.from(this.networkProfiles.values()).find(
      (p) => p.type === connectionType && p.quality === quality
    );

    if (profile) {
      return profile.autoResume;
    }

    return quality !== 'poor' && this.networkService.isOnline();
  }

  public addNetworkProfile(profile: Omit<NetworkProfile, 'id' | 'createdAt'>): NetworkProfile {
    const newProfile: NetworkProfile = {
      ...profile,
      id: `profile_${Date.now()}`,
      createdAt: Date.now(),
    };
    this.networkProfiles.set(newProfile.id, newProfile);
    this.saveNetworkProfiles();
    this.notifyListeners();
    return newProfile;
  }

  public updateNetworkProfile(id: string, updates: Partial<NetworkProfile>): boolean {
    const profile = this.networkProfiles.get(id);
    if (profile) {
      this.networkProfiles.set(id, { ...profile, ...updates });
      this.saveNetworkProfiles();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public deleteNetworkProfile(id: string): boolean {
    if (this.networkProfiles.delete(id)) {
      this.saveNetworkProfiles();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public getNetworkProfiles(): NetworkProfile[] {
    return Array.from(this.networkProfiles.values());
  }

  public getCurrentNetworkProfile(): NetworkProfile | undefined {
    const quality = this.networkService.getQuality();
    const connectionType = this.networkService.getConnectionType();

    return Array.from(this.networkProfiles.values()).find(
      (p) => p.type === connectionType && p.quality === quality
    );
  }

  public addListener(listener: (stats: EdgeComputingStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach((listener) => listener(stats));
  }

  public stop(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
    this.wasmModules.clear();
    this.localModels.clear();
    this.listeners.clear();
  }
}