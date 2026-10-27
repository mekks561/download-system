import http from 'node:http';
import { createReadStream, existsSync, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { parse } from 'node:url';
import ffmpeg from 'fluent-ffmpeg';
import AdmZip from 'adm-zip';
import { WorkerPluginHost } from '../plugins/WorkerPluginHost.js';

export class InternalServerService {
  private server: http.Server | null = null;
  private port: number;
  private downloadRoot: string;
  private internalSecret: string;
  private pluginHost: WorkerPluginHost;

  constructor(port: number = 5002, pluginHost?: WorkerPluginHost) {
    this.port = port;
    this.internalSecret = process.env.INTERNAL_SECRET || 'default-secret';
    
    const configured = process.env.DM_DOWNLOAD_ROOT?.trim();
    this.downloadRoot = resolve(configured && configured.length > 0 ? configured : join(process.cwd(), 'downloads'));

    this.pluginHost = pluginHost || new WorkerPluginHost({
      pluginsDir: join(process.cwd(), 'plugins')
    });
  }

  async start() {
    await this.pluginHost.init();

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
      } else if (pathname === '/internal/sync-plugin') {
        const pluginId = req.headers['x-plugin-id'] as string;
        if (!pluginId) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing X-Plugin-Id');
          return;
        }

        if (req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              const pluginDir = join(process.cwd(), 'plugins', pluginId);
              
              // 确保目录存在且为空
              mkdirSync(pluginDir, { recursive: true });
              
              const zip = new AdmZip(buffer);
              zip.extractAllTo(pluginDir, true);

              // 通知 PluginHost 加载/重新加载插件
              await this.pluginHost.loadPlugin(pluginId);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: `Plugin ${pluginId} synced` }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.method === 'DELETE') {
          try {
            const pluginDir = join(process.cwd(), 'plugins', pluginId);
            await this.pluginHost.unloadPlugin(pluginId);
            if (existsSync(pluginDir)) {
              rmSync(pluginDir, { recursive: true, force: true });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Plugin ${pluginId} uninstalled` }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        } else {
          res.writeHead(405);
          res.end();
        }
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
      case 'LIST_ARCHIVE': {
        const { filename } = args;
        const filePath = join(this.downloadRoot, filename);
        if (!existsSync(filePath)) throw new Error(`文件不存在: ${filename}`);

        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        const files = entries.map((entry: any) => ({
          path: entry.entryName,
          size: entry.header.size,
          isDirectory: entry.isDirectory
        }));

        return { success: true, files };
      }
      case 'RUN_PLUGIN_METHOD': {
        const { pluginId, method, args: methodArgs } = args;
        await this.pluginHost.invoke(pluginId, method, methodArgs);
        return { success: true };
      }
      default:
        throw new Error(`未知的任务类型: ${taskType}`);
    }
  }

  stop() {
    this.server?.close();
  }
}
