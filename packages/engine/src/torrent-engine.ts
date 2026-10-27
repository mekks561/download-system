// import WebTorrent from 'webtorrent';
// @ts-ignore
import magnet from 'magnet-uri';
import { BaseEngine } from './base-engine.js';

let globalClient: any = null;

function getClient(): any {
  if (!globalClient) {
    // globalClient = new WebTorrent();
    globalClient = {
      on: () => {},
      add: () => {},
      throttleDownload: () => {}
    };
    globalClient.on('error', (err: any) => {
      console.error('[torrent-engine] 全局错误:', err);
    });
  }
  return globalClient;
}

export interface TorrentEngineOptions {
  id: number;
  url: string;
  selectedFiles?: number[];
  announce?: string[];
  speedLimit?: number;
}

export class TorrentEngine extends BaseEngine {
  private torrent: any = null;
  private lastUpdateAt = 0;
  private lastUpdateBytes = 0;

  constructor(downloadRoot: string) {
    super(downloadRoot);
  }

  static async parseMetadata(uri: string | Buffer): Promise<{
    name: string;
    infoHash: string;
    files: Array<{ name: string; size: number; path: string }>;
  }> {
    const c = getClient();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (typeof uri === 'string') {
          const parsed = magnet.decode(uri);
          if (parsed && parsed.infoHash) {
            resolve({
              name: parsed.name || '正在解析中...',
              infoHash: parsed.infoHash,
              files: [],
            });
            return;
          }
        }
        reject(new Error('解析种子元数据超时'));
      }, 30000);

      c.add(uri, { announce: [] }, (torrent: any) => {
        clearTimeout(timeout);
        const result = {
          name: torrent.name,
          infoHash: torrent.infoHash,
          files: torrent.files.map((f: any) => ({
            name: f.name,
            size: f.length,
            path: f.path,
          })),
        };
        torrent.destroy();
        resolve(result);
      });
    });
  }

  async start(options: TorrentEngineOptions): Promise<void> {
    const c = getClient();
    
    if (options.speedLimit && options.speedLimit > 0) {
      c.throttleDownload(options.speedLimit);
    } else {
      c.throttleDownload(-1);
    }

    let torrentSource: string | Buffer = options.url;
    if (options.url.startsWith('data:application/x-bittorrent;base64,')) {
      torrentSource = Buffer.from(options.url.split(',')[1], 'base64');
    }

    return new Promise((resolve) => {
      c.add(torrentSource, { path: this.downloadRoot, announce: options.announce }, (torrent: any) => {
        this.torrent = torrent;

        if (options.selectedFiles && options.selectedFiles.length > 0) {
          torrent.deselect(0, torrent.pieces.length - 1, 0);
          options.selectedFiles.forEach(idx => {
            if (torrent.files[idx]) torrent.files[idx].select();
          });
        }

        torrent.on('download', () => {
          this.emitProgress();
        });

        torrent.on('done', () => {
          this.emit('complete', {
            filename: torrent.name,
            path: torrent.path,
            size: torrent.length
          });
          this.cleanup();
          resolve();
        });

        torrent.on('error', (err: any) => {
          this.emit('error', err.message || String(err));
          this.cleanup();
          resolve();
        });
      });
    });
  }

  async pause(): Promise<void> {
    this.emit('paused', { downloadedBytes: this.torrent?.downloaded || 0 });
    this.cleanup();
  }

  async cancel(): Promise<void> {
    this.emit('cancelled');
    this.cleanup();
  }

  private cleanup() {
    if (this.torrent) {
      this.torrent.destroy();
      this.torrent = null;
    }
  }

  private emitProgress() {
    if (!this.torrent) return;
    const now = Date.now();
    if (now - this.lastUpdateAt < 1000 && this.torrent.downloaded - this.lastUpdateBytes < 1024 * 1024) {
      return;
    }

    this.lastUpdateAt = now;
    this.lastUpdateBytes = this.torrent.downloaded;

    this.emit('progress', {
      downloadedBytes: this.torrent.downloaded,
      totalBytes: this.torrent.length,
      speed: Math.round(this.torrent.downloadSpeed),
      status: 'downloading',
      peers: this.torrent.numPeers
    });
  }
}
