import { detectProtocol, isBtProtocol } from '../utils/protocol';
import * as downloadService from './download.service';
import * as httpEngine from './download-engine.service';
import * as torrentEngine from './torrent-engine.service';
import { getDiskUsage } from './resource.service';
import { AppError } from '../utils/errors';
import { workerManager } from './worker-manager.service';
import { redis } from '../config/redis';
import { REDIS_CHANNELS, TaskDispatchPayload, TaskControlPayload } from '@dm/shared';
import axios from 'axios';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 下载任务管理中心（Master 逻辑）。
 * 负责任务的校验、分发（Local/Worker）及状态控制。
 */
export class DownloadManager {
  /**
   * 启动下载任务
   */
  static async start(id: number, userId: number) {
    const download = await downloadService.getDownloadById(id, userId);
    
    // 如果任务已经绑定了 Worker，且该 Worker 在线，则发送 resume 指令
    const metadata = (download.metadata as any) || {};
    if (metadata.workerId) {
      const worker = workerManager.getWorker(metadata.workerId);
      if (worker) {
        const payload: TaskControlPayload = { taskId: id, action: 'resume' };
        await redis.publish(`${REDIS_CHANNELS.TASKS_CONTROL}:${worker.workerId}`, JSON.stringify(payload));
        return;
      }
    }

    // 1. 调度选择 Worker
    const bestWorker = workerManager.getBestWorker();
    const protocol = detectProtocol(download.url);

    if (bestWorker) {
      console.log(`[DownloadManager] Dispatching task ${id} to worker ${bestWorker.workerId}`);
      
      // 校验 Worker 磁盘空间
      if (download.totalBytes > 0n && BigInt(bestWorker.diskUsage.available) < download.totalBytes) {
        throw new AppError('DISK_FULL', 400, `Worker ${bestWorker.workerId} 磁盘空间不足`);
      }

      const payload: TaskDispatchPayload = {
        taskId: id,
        userId: userId,
        url: download.url,
        protocol: isBtProtocol(protocol) ? (protocol === 'magnet' ? 'magnet' : 'torrent') : 'http',
        filename: download.filename || undefined,
        metadata: download.metadata
      };

      // 更新任务记录，绑定 WorkerId
      await downloadService.updateDownload(id, userId, { 
        metadata: { ...metadata, workerId: bestWorker.workerId } 
      });

      // 发布任务
      await redis.publish(`${REDIS_CHANNELS.TASKS_DISPATCH}:${bestWorker.workerId}`, JSON.stringify(payload));
      return;
    }

    // 2. 无可用 Worker 时回退到 Local 逻辑
    console.log(`[DownloadManager] No workers available, fallback to local for task ${id}`);
    // ... 原有 Local 逻辑保持不变
    if (download.totalBytes > 0n) {
      const disk = await getDiskUsage();
      if (disk && BigInt(disk.available) < download.totalBytes) {
        throw new AppError('DISK_FULL', 400, `服务器本地磁盘空间不足`);
      }
    }

    if (isBtProtocol(protocol)) {
      await torrentEngine.startTorrent(id, userId, download.url);
    } else {
      await httpEngine.start(id, userId);
    }
  }

  /**
   * 暂停下载任务
   */
  static async pause(id: number, userId: number) {
    const download = await downloadService.getDownloadById(id, userId);
    const metadata = (download.metadata as any) || {};

    if (metadata.workerId) {
      const payload: TaskControlPayload = { taskId: id, action: 'pause' };
      await redis.publish(`${REDIS_CHANNELS.TASKS_CONTROL}:${metadata.workerId}`, JSON.stringify(payload));
      return;
    }

    const protocol = detectProtocol(download.url);
    if (isBtProtocol(protocol)) {
      await torrentEngine.pauseTorrent(id, userId);
    } else {
      await httpEngine.pause(id, userId);
    }
  }

  /**
   * 取消下载任务
   */
  static async cancel(id: number, userId: number) {
    const download = await downloadService.getDownloadById(id, userId);
    const metadata = (download.metadata as any) || {};

    if (metadata.workerId) {
      const payload: TaskControlPayload = { taskId: id, action: 'cancel' };
      await redis.publish(`${REDIS_CHANNELS.TASKS_CONTROL}:${metadata.workerId}`, JSON.stringify(payload));
      return;
    }

    const protocol = detectProtocol(download.url);
    if (isBtProtocol(protocol)) {
      await torrentEngine.cancelTorrent(id, userId);
    } else {
      await httpEngine.cancel(id, userId);
    }
  }

  /**
   * 删除任务及其关联文件
   */
  static async remove(id: number, userId: number) {
    const existing = await downloadService.getDownloadById(id, userId);
    const metadata = (existing.metadata as any) || {};

    if (metadata.workerId) {
      const payload: TaskControlPayload = { taskId: id, action: 'delete' };
      await redis.publish(`${REDIS_CHANNELS.TASKS_CONTROL}:${metadata.workerId}`, JSON.stringify(payload));
    } else {
      const protocol = detectProtocol(existing.url);
      if (isBtProtocol(protocol)) {
        await torrentEngine.cancelTorrent(id, userId).catch(() => undefined);
      } else {
        await httpEngine.cancel(id, userId).catch(() => undefined);
        if (typeof existing.filename === 'string') {
          httpEngine.purgeArtifacts(existing.filename);
        }
      }
    }
    
    await downloadService.deleteDownload(id, userId);
  }

  /**
   * 文件代理网关逻辑
   */
  static async streamFile(id: number, userId: number, res: Response) {
    const download = await downloadService.getDownloadById(id, userId);
    if (download.status !== 'completed') {
      throw new AppError('NOT_FOUND', 404, '文件尚未下载完成');
    }

    const metadata = (download.metadata as any) || {};
    const filename = download.filename;

    if (metadata.workerId) {
      // 分布式代理模式
      const worker = workerManager.getWorker(metadata.workerId);
      if (!worker) {
        throw new AppError('SERVICE_UNAVAILABLE', 503, `存储该文件的 Worker (${metadata.workerId}) 目前不在线`);
      }

      const internalUrl = `http://${worker.ip}:${worker.port}/internal/stream/${encodeURIComponent(filename)}`;
      
      try {
        const response = await axios({
          method: 'get',
          url: internalUrl,
          responseType: 'stream',
          headers: {
            'X-Internal-Secret': process.env.INTERNAL_SECRET || 'default-secret'
          }
        });

        res.set(response.headers);
        response.data.pipe(res);
      } catch (err) {
        console.error(`[DownloadManager] Proxy failed for ${id}:`, err);
        throw new AppError('INTERNAL_ERROR', 500, '代理文件流失败');
      }
    } else {
      // 本地模式
      const root = httpEngine.downloadRoot();
      const filePath = join(root, filename);
      if (!existsSync(filePath)) {
        throw new AppError('NOT_FOUND', 404, '本地文件已丢失');
      }

      res.download(filePath, filename);
    }
  }
}
