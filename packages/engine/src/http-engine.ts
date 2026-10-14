import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { basename, join } from 'node:path';
import Throttle from 'throttle';
import { BaseEngine } from './base-engine.js';

const USER_AGENT = 'download-manager/1.0 (+distributed-engine)';

export interface HttpEngineOptions {
  id: number;
  url: string;
  filename: string;
  resumeFrom?: number;
  speedLimit?: number;
}

export class HttpEngine extends BaseEngine {
  private controller: AbortController | null = null;
  private downloadedBytes = 0;
  private totalBytes = 0;
  private lastUpdateAt = 0;
  private lastUpdateBytes = 0;
  private options: HttpEngineOptions | null = null;
  private intent: 'run' | 'pause' | 'cancel' = 'run';

  constructor(downloadRoot: string) {
    super(downloadRoot);
  }

  async start(options: HttpEngineOptions): Promise<void> {
    this.options = options;
    this.intent = 'run';
    this.downloadedBytes = options.resumeFrom || 0;
    this.lastUpdateBytes = this.downloadedBytes;
    this.lastUpdateAt = Date.now();

    const partPath = this.getPartPath(options.filename);
    mkdirSync(this.downloadRoot, { recursive: true });

    const headers: Record<string, string> = { 'user-agent': USER_AGENT };
    if (this.downloadedBytes > 0) headers.range = `bytes=${this.downloadedBytes}-`;

    this.controller = new AbortController();

    try {
      const response = await fetch(options.url, { 
        headers, 
        signal: this.controller.signal, 
        redirect: 'follow' 
      });

      if (!response.ok) {
        throw new Error(`上游返回 HTTP ${response.status} ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error('上游未返回响应体');
      }

      const append = this.downloadedBytes > 0 && response.status === 206;
      const baseBytes = append ? this.downloadedBytes : 0;
      const contentLength = Number(response.headers.get('content-length') ?? 0);

      this.downloadedBytes = baseBytes;
      this.totalBytes = contentLength > 0 ? baseBytes + contentLength : 0;
      this.lastUpdateBytes = baseBytes;

      const fileStream = createWriteStream(partPath, { flags: append ? 'a' : 'w' });
      let source = Readable.fromWeb(response.body as unknown as WebReadableStream<Uint8Array>);

      if (options.speedLimit && options.speedLimit > 0) {
        source = source.pipe(new Throttle(options.speedLimit)) as unknown as Readable;
      }

      source.on('data', (chunk: Buffer) => {
        this.downloadedBytes += chunk.length;
        this.emitProgress();
      });

      await pipeline(source, fileStream);

      if (this.intent !== 'run') return;

      const finalName = this.sanitizeFilename(basename(partPath).replace(/^\./, '').replace(/\.part$/, ''));
      const finalPath = this.uniqueFinalPath(finalName);
      renameSync(partPath, finalPath);
      const size = statSync(finalPath).size;

      this.emit('complete', { filename: finalName, path: finalPath, size });
    } catch (err: any) {
      if (this.intent === 'pause') {
        this.emit('paused', { downloadedBytes: this.downloadedBytes });
      } else if (this.intent === 'cancel') {
        this.safeUnlink(partPath);
        this.emit('cancelled');
      } else {
        this.emit('error', err.message || String(err));
      }
    }
  }

  async pause(): Promise<void> {
    this.intent = 'pause';
    this.controller?.abort();
  }

  async cancel(): Promise<void> {
    this.intent = 'cancel';
    this.controller?.abort();
  }

  private emitProgress() {
    const now = Date.now();
    if (now - this.lastUpdateAt < 500 && this.downloadedBytes - this.lastUpdateBytes < 512 * 1024) {
      return;
    }

    const bytesThisWindow = this.downloadedBytes - this.lastUpdateBytes;
    const timeThisWindow = Math.max(1, now - this.lastUpdateAt) / 1000;
    const speed = Math.max(0, Math.round(bytesThisWindow / timeThisWindow));

    this.lastUpdateAt = now;
    this.lastUpdateBytes = this.downloadedBytes;

    this.emit('progress', {
      downloadedBytes: this.downloadedBytes,
      totalBytes: this.totalBytes,
      speed,
      status: 'downloading'
    });
  }

  private sanitizeFilename(raw: string): string {
    const base = basename(raw).replace(/\p{Cc}/gu, '').trim();
    return (base.length > 0 ? base : 'download').slice(0, 200);
  }

  private getPartPath(filename: string): string {
    return join(this.downloadRoot, `.${this.sanitizeFilename(filename)}.part`);
  }

  private uniqueFinalPath(filename: string): string {
    const first = join(this.downloadRoot, filename);
    if (!existsSync(first)) return first;
    const dot = filename.lastIndexOf('.');
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const ext = dot > 0 ? filename.slice(dot) : '';
    for (let i = 1; i < 10000; i += 1) {
      const candidate = join(this.downloadRoot, `${stem} (${i})${ext}`);
      if (!existsSync(candidate)) return candidate;
    }
    return join(this.downloadRoot, `${stem}-${Date.now()}${ext}`);
  }

  private safeUnlink(path: string): void {
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {}
  }
}
