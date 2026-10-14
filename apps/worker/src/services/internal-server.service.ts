import http from 'node:http';
import { createReadStream, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { parse } from 'node:url';
import ffmpeg from 'fluent-ffmpeg';

export class InternalServerService {
  private server: http.Server | null = null;
  private port: number;
  private downloadRoot: string;
  private internalSecret: string;

  constructor(port: number = 5002) {
    this.port = port;
    this.internalSecret = process.env.INTERNAL_SECRET || 'default-secret';
    
    const configured = process.env.DM_DOWNLOAD_ROOT?.trim();
    this.downloadRoot = resolve(configured && configured.length > 0 ? configured : join(process.cwd(), 'downloads'));
  }

  async start() {
    this.server = http.createServer(async (req, res) => {
      const { pathname } = parse(req.url || '', true);
      
      // PSK Auth
      const secret = req.headers['x-internal-secret'];
      if (secret !== this.internalSecret) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden: Invalid secret');
        return;
      }

      if (pathname?.startsWith('/internal/stream/')) {
        const filename = decodeURIComponent(pathname.replace('/internal/stream/', ''));
        const filePath = join(this.downloadRoot, filename);

        if (!existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        const stats = statSync(filePath);
        if (stats.isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Cannot stream directory');
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': stats.size,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
        });

        const readStream = createReadStream(filePath);
        readStream.pipe(res);
      } else if (pathname === '/internal/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', workerId: process.env.WORKER_ID }));
      } else if (pathname === '/internal/plugin-hook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { taskType, args } = JSON.parse(body);
            const result = await this.handlePluginHook(taskType, args);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    return new Promise<void>((resolve) => {
      this.server?.listen(this.port, '0.0.0.0', () => {
        console.log(`[InternalServer] Listening on port ${this.port} (Internal Gateway)`);
        resolve();
      });
    });
  }

  private async handlePluginHook(taskType: string, args: any): Promise<any> {
    console.log(`[InternalServer] Handling plugin hook: ${taskType}`);
    
    switch (taskType) {
      case 'VIDEO_PREVIEW': {
        const { filename, taskId } = args;
        const filePath = join(this.downloadRoot, filename);
        const outputDir = join(this.downloadRoot, '.previews', taskId);
        const outputPath = join(outputDir, 'thumb.jpg');

        if (!existsSync(filePath)) throw new Error(`文件不存在: ${filename}`);
        
        mkdirSync(outputDir, { recursive: true });

        return new Promise((resolve, reject) => {
          ffmpeg(filePath)
            .screenshots({
              timestamps: ['10%'],
              filename: 'thumb.jpg',
              folder: outputDir,
              size: '320x?'
            })
            .on('end', () => {
              console.log(`[InternalServer] Preview generated for ${filename}`);
              resolve({ success: true, previewPath: outputPath });
            })
            .on('error', (err) => {
              console.error(`[InternalServer] FFMPEG error: ${err.message}`);
              reject(err);
            });
        });
      }
      default:
        throw new Error(`未知的任务类型: ${taskType}`);
    }
  }

  stop() {
    this.server?.close();
  }
}
