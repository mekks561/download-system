import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { prisma } from '../config/prisma.js';
import * as aiService from './ai.service.js';
import * as downloadService from './download.service.js';
import { downloadRoot } from './download-engine.service.js';
import { redis } from '../config/redis.js';
import { REDIS_CHANNELS } from '@dm/shared';
import { workerManager } from './worker-manager.service.js';

/**
 * 智能文件生命周期管理 (Archiving Service)
 * 工业化 2.0: 识别冷热数据并执行自动归档
 */
export class ArchivingService {
  private static instance: ArchivingService;

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new ArchivingService();
    }
    return this.instance;
  }

  /** 获取归档建议 */
  async getArchivingSuggestions(): Promise<aiService.ArchivingSuggestion[]> {
    const downloads = await prisma.download.findMany({
      where: { status: 'completed' },
      take: 50, // 仅分析最近一部分完成的任务
    });

    const fileList = downloads.map(d => ({
      taskId: d.id,
      filename: d.filename,
      lastAccessedAt: (d.metadata as any)?.lastAccessedAt || d.createdAt.toISOString(),
      size: d.totalBytes.toString(),
      category: (d.metadata as any)?.aiCategory
    }));

    const suggestions = await aiService.suggestArchiving(fileList);
    return suggestions || [];
  }

  /** 执行归档动作 */
  async applyArchivingAction(taskId: number, action: string) {
    const download = await downloadService.getDownloadByIdSimple(taskId);
    if (!download) throw new Error('任务不存在');

    const metadata = (download.metadata as any) || {};
    const workerId = metadata.workerId;

    if (!workerId) {
      // 本地模式：物理压缩逻辑
      const root = downloadRoot();
      const filePath = join(root, download.filename);
      const archiveDir = join(root, 'archives');
      
      if (!existsSync(archiveDir)) {
        mkdirSync(archiveDir, { recursive: true });
      }

      if (action === 'compress' || action === 'move_to_archive') {
        if (existsSync(filePath)) {
          const zip = new AdmZip();
          zip.addLocalFile(filePath);
          const archivePath = join(archiveDir, `${download.filename}.zip`);
          zip.writeZip(archivePath);
          
          // 删除原文件
          unlinkSync(filePath);
          console.log(`[Archiving] 本地文件归档完成: ${download.filename} -> ${archivePath}`);
        }
      }

      await this.updateArchivingStatus(taskId, action, 'local');
      return { success: true, mode: 'local' };
    }

    // 分布式模式：下发指令给 Worker
    const worker = workerManager.getWorker(workerId);
    if (!worker) throw new Error('Worker 不在线，无法执行归档');

    await redis.publish(`${REDIS_CHANNELS.TASKS_DISPATCH}:${workerId}`, JSON.stringify({
      type: 'ARCHIVE_FILE',
      taskId,
      action, // compress | move_to_archive
      filename: download.filename
    }));

    await this.updateArchivingStatus(taskId, action, workerId);
    return { success: true, mode: 'distributed', workerId };
  }

  private async updateArchivingStatus(taskId: number, action: string, location: string) {
    await downloadService.updateDownloadMetadataInternal(taskId, {
      archivedAt: new Date().toISOString(),
      archivingAction: action,
      archiveLocation: location,
      status: 'archived'
    });
    
    // 同时更新主表状态（可选，也可以保持 completed 仅在元数据标记）
    await downloadService.updateDownloadStatusInternal(taskId, 'completed'); 
  }

  /** 从归档中恢复 */
  async restoreFromArchive(taskId: number) {
    const download = await downloadService.getDownloadByIdSimple(taskId);
    if (!download) throw new Error('任务不存在');

    const metadata = (download.metadata as any) || {};
    if (metadata.status !== 'archived') {
      throw new Error('该任务未处于归档状态');
    }

    const workerId = metadata.workerId;
    if (!workerId) {
      // 本地模式：物理恢复逻辑
      const root = downloadRoot();
      const archivePath = join(root, 'archives', `${download.filename}.zip`);
      
      if (existsSync(archivePath)) {
        const zip = new AdmZip(archivePath);
        zip.extractAllTo(root, true);
        
        // 删除压缩包
        unlinkSync(archivePath);
        console.log(`[Archiving] 本地文件恢复完成: ${download.filename}`);
      }

      await this.clearArchivingStatus(taskId);
      return { success: true, mode: 'local' };
    }

    // 分布式模式：下发指令给 Worker 进行解压或迁回
    const worker = workerManager.getWorker(workerId);
    if (!worker) throw new Error('Worker 不在线，无法执行恢复');

    await redis.publish(`${REDIS_CHANNELS.TASKS_DISPATCH}:${workerId}`, JSON.stringify({
      type: 'RESTORE_FILE',
      taskId,
      filename: download.filename
    }));

    await this.clearArchivingStatus(taskId);
    return { success: true, mode: 'distributed', workerId };
  }

  private async clearArchivingStatus(taskId: number) {
    const download = await downloadService.getDownloadByIdSimple(taskId);
    if (!download) return;

    const metadata = (download.metadata as any) || {};
    delete metadata.archivedAt;
    delete metadata.archivingAction;
    delete metadata.archiveLocation;
    delete metadata.status; // 清除归档状态标记

    await downloadService.updateDownloadMetadataInternal(taskId, metadata);
  }
}

export const archivingService = ArchivingService.getInstance();
