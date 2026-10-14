import { EventEmitter } from 'node:events';

export interface EngineProgress {
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled';
  peers?: number;
}

export interface EngineEvents {
  progress: [EngineProgress];
  complete: [{ filename: string; path: string; size: number }];
  error: [Error | string];
  cancelled: [];
  paused: [{ downloadedBytes: number }];
}

export abstract class BaseEngine extends EventEmitter {
  protected downloadRoot: string;

  constructor(downloadRoot: string) {
    super();
    this.downloadRoot = downloadRoot;
  }

  abstract start(options: any): Promise<void>;
  abstract pause(): Promise<void>;
  abstract cancel(): Promise<void>;

  override emit<K extends keyof EngineEvents>(event: K, ...args: EngineEvents[K]): boolean {
    return super.emit(event, ...args);
  }

  override on<K extends keyof EngineEvents>(event: K, listener: (...args: EngineEvents[K]) => void): this {
    return super.on(event, listener);
  }
}
