import fs from 'node:fs/promises';
import path from 'node:path';
import diskusage from 'diskusage';
import { prisma } from '../config/prisma';
import { recordActivity } from './activity.service';
import { resolveDownloadRoot } from './storage.service';
import { getIO } from '../config/socket';
import { getSettings } from './settings.service';
import { purgeArtifacts } from './download-engine.service';

/**
 * 获取物理磁盘使用情况
 */
export async function getDiskUsage() {
  const root = resolveDownloadRoot();
  try {
    const info = await diskusage.check(root);
    return {
      available: info.available,
      total: info.total,
      free: info.free,
      used: info.total - info.available,
      percent: Math.round(((info.total - info.available) / info.total) * 10000) / 100,
    };
  } catch (err) {
    console.error('[resource] 获取磁盘空间失败:', err);
    return null;
  }
}

/**
 * 推送磁盘空间信息给所有在线用户（或按需推送）
 */
export async function broadcastDiskUsage() {
  const usage = await getDiskUsage();
  if (!usage) return;

  try {
    const io = getIO();
    io.emit('diskUsage', {
      ...usage,
      available: usage.available.toString(),
      total: usage.total.toString(),
      free: usage.free.toString(),
      used: usage.used.toString(),
    });
  } catch {
    // ignore
  }
}

/**
 * 递归计算目录大小
 */
export async function getDirSize(dirPath: string): Promise<bigint> {
  let size = 0n;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += await getDirSize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        size += BigInt(stats.size);
      }
    }
  } catch (err) {
    // 目录不存在或读取失败时返回 0n
    return 0n;
  }
  return size;
}

/**
 * 获取占用排行：从下载和上传目录中挑出最大的前 N 个项
 */
export async function getTopUsage(limit: number = 10) {
  const downloadDir = resolveDownloadRoot();
  const uploadDir = process.env.UPLOAD_PATH || './uploads';

  const items: Array<{ name: string; size: bigint; type: 'file' | 'directory' }> = [];

  const scanDir = async (dirPath: string, prefix: string = '') => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        const stats = await fs.stat(fullPath);
        items.push({
          name: prefix + file.name,
          size: BigInt(stats.size),
          type: file.isDirectory() ? 'directory' : 'file',
        });
      }
    } catch (err) {
      // Ignore
    }
  };

  await Promise.all([
    scanDir(downloadDir, '[下载] '),
    scanDir(uploadDir, '[上传] '),
  ]);

  return items
    .sort((a, b) => (a.size > b.size ? -1 : 1))
    .slice(0, limit)
    .map(item => ({
      ...item,
      size: item.size.toString(),
    }));
}

/**
 * 扫描资源占用并保存统计快照，同时记录系统活动
 */
export async function scanStorage() {
  const downloadDir = resolveDownloadRoot();
  const uploadDir = process.env.UPLOAD_PATH || './uploads';
  const pluginDir = './data/plugins';

  // 1. 先执行 LRU 清理，确保空间不会溢出
  await performLRUCleanup();

  const [dSize, uSize, pSize, topUsage] = await Promise.all([
    getDirSize(downloadDir),
    getDirSize(uploadDir),
    getDirSize(pluginDir),
    getTopUsage(10),
  ]);

  // DB 大小统计 (MySQL 通过查询 information_schema 获取)
  let dbSize = 0n;
  try {
    const dbName = process.env.MYSQL_DATABASE || 'download_manager';
    // $queryRaw 返回的是数组，MySQL SUM 可能返回字符串或数字，取决于驱动
    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT SUM(data_length + index_length) AS size 
       FROM information_schema.TABLES 
       WHERE table_schema = '${dbName}'`
    );
    if (result && result[0] && result[0].size) {
      dbSize = BigInt(result[0].size);
    }
  } catch (err) {
    console.warn('[resource] 计算数据库体积失败:', err);
  }

  const stats = await prisma.storageStats.create({
    data: {
      totalBytes: dSize + uSize + pSize + dbSize,
      downloadDir: dSize,
      uploadDir: uSize,
      pluginDir: pSize,
      dbSize,
    }
  });

  // 记录系统活动：查找第一个管理员作为执行者
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true }
  });

  if (admin) {
    await recordActivity({
      userId: admin.id,
      type: 'SYSTEM_STORAGE_SCAN',
      description: `系统存储扫描完成，总计占用: ${(Number(stats.totalBytes) / 1024 / 1024).toFixed(2)} MB`,
      metadata: {
        totalBytes: stats.totalBytes.toString(),
        downloadDir: stats.downloadDir.toString(),
        uploadDir: stats.uploadDir.toString(),
        pluginDir: stats.pluginDir.toString(),
        dbSize: stats.dbSize.toString(),
      }
    });
  }

  return { stats, topUsage };
}

/**
 * 清理过期资源：过期分享关联的文件与临时 .part 文件
 * @param days 分享过期后的保留天数（超过此天数则物理清理）
 */
export async function cleanupExpiredResources(days: number = 7) {
  const now = new Date();
  const expiryThreshold = new Date();
  expiryThreshold.setDate(now.getDate() - days);

  let cleanedFilesCount = 0;
  let cleanedBytes = 0n;
  let cleanedPartFilesCount = 0;

  // 1. 清理过期分享关联的文件记录
  // 查找已过期超过阈值的分享
  const expiredShares = await prisma.share.findMany({
    where: {
      expiresAt: { lt: expiryThreshold },
    },
    include: {
      file: true,
    },
  });

  // 使用 Set 记录已处理的文件 ID，避免重复删除导致报错
  const processedFileIds = new Set<number>();

  for (const share of expiredShares) {
    if (share.file) {
      if (processedFileIds.has(share.fileId)) {
        continue;
      }
      processedFileIds.add(share.fileId);

      try {
        const root = resolveDownloadRoot();
        const absPath = path.isAbsolute(share.file.path)
          ? share.file.path
          : path.join(root, share.file.path);

        const stats = await fs.stat(absPath).catch(() => null);
        if (stats) {
          cleanedBytes += BigInt(stats.size);
          await fs.unlink(absPath);
        }
        
        // 删除文件记录（级联删除所有关联的分享记录）
        await prisma.file.delete({ where: { id: share.file.id } });
        cleanedFilesCount++;
      } catch (err) {
        console.error(`[resource] 清理过期文件失败 #${share.file.id}:`, err);
      }
    } else {
      // 如果文件记录已不存在，仅删除分享记录
      await prisma.share.delete({ where: { id: share.id } }).catch(() => null);
    }
  }

  // 2. 清理临时 .part 文件
  // 规则：24 小时未更新的 .part 文件视为僵尸任务残留
  const downloadDir = resolveDownloadRoot();
  try {
    if (await fs.stat(downloadDir).then(s => s.isDirectory()).catch(() => false)) {
      const files = await fs.readdir(downloadDir);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith('.part')) {
          const fullPath = path.join(downloadDir, file);
          const stats = await fs.stat(fullPath).catch(() => null);
          if (stats && stats.mtimeMs < oneDayAgo) {
            await fs.unlink(fullPath);
            cleanedPartFilesCount++;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[resource] 清理 .part 文件失败:', err);
  }

  // 记录活动
  if (cleanedFilesCount > 0 || cleanedPartFilesCount > 0) {
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true }
    });

    if (admin) {
      await recordActivity({
        userId: admin.id,
        type: 'SYSTEM_RESOURCE_CLEANUP',
        description: `资源自动清理完成：删除过期文件 ${cleanedFilesCount} 个，清理临时文件 ${cleanedPartFilesCount} 个，释放空间 ${(Number(cleanedBytes) / 1024 / 1024).toFixed(2)} MB`,
        metadata: {
          cleanedFilesCount,
          cleanedBytes: cleanedBytes.toString(),
          cleanedPartFilesCount,
        }
      });
    }
  }

  return { cleanedFilesCount, cleanedBytes, cleanedPartFilesCount };
}

/**
 * LRU (最近最少使用) 磁盘空间清理：当磁盘空间不足时，自动清理最早完成的下载任务。
 */
export async function performLRUCleanup(targetPercent: number = 70) {
  const usage = await getDiskUsage();
  if (!usage || usage.percent <= 90) return null; // 仅在 90% 以上触发

  console.log(`[LRU Cleanup] 磁盘占用 ${usage.percent}% 已超阈值，开始清理至 ${targetPercent}%...`);
  
  let currentUsed = usage.used;
  const targetUsed = (usage.total * BigInt(targetPercent)) / 100n;
  let cleanedCount = 0;
  let cleanedBytes = 0n;

  // 查找已完成的任务，按完成时间正序排列（最旧的在前）
  const completedDownloads = await prisma.download.findMany({
    where: { status: 'completed' },
    orderBy: { completedAt: 'asc' },
  });

  const root = resolveDownloadRoot();

  for (const download of completedDownloads) {
    if (currentUsed <= targetUsed) break;

    try {
      const filePath = path.join(root, download.filename);
      const stats = await fs.stat(filePath).catch(() => null);
      
      if (stats) {
        await fs.unlink(filePath);
        cleanedBytes += BigInt(stats.size);
        currentUsed -= BigInt(stats.size);
      }

      // 更新数据库状态为已过期/已清理
      await prisma.download.update({
        where: { id: download.id },
        data: { status: 'cancelled', error: '因磁盘空间不足被 LRU 策略自动清理' }
      });

      cleanedCount++;
    } catch (err) {
      console.warn(`[LRU Cleanup] 清理任务 #${download.id} 失败:`, err);
    }
  }

  if (cleanedCount > 0) {
    console.log(`[LRU Cleanup] 完成：清理了 ${cleanedCount} 个任务，释放 ${(Number(cleanedBytes) / 1024 / 1024).toFixed(2)} MB`);
    
    // 记录系统活动
    const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
    if (admin) {
      await recordActivity({
        userId: admin.id,
        type: 'SYSTEM_LRU_CLEANUP',
        description: `磁盘空间自动回容 (LRU)：清理了 ${cleanedCount} 个旧任务，释放 ${(Number(cleanedBytes) / 1024 / 1024).toFixed(2)} MB`,
        metadata: { cleanedCount, cleanedBytes: cleanedBytes.toString() }
      });
    }
  }

  return { cleanedCount, cleanedBytes };
}

/**
 * 获取待清理资源的预览信息
 */
export async function getCleanupPreview(days: number = 7) {
  const now = new Date();
  const expiryThreshold = new Date();
  expiryThreshold.setDate(now.getDate() - days);

  const [expiredShares, zombieParts] = await Promise.all([
    prisma.share.findMany({
      where: { expiresAt: { lt: expiryThreshold } },
      include: { file: true }
    }),
    (async () => {
      const downloadDir = resolveDownloadRoot();
      const files = await fs.readdir(downloadDir).catch(() => []);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const parts = [];
      for (const file of files) {
        if (file.endsWith('.part')) {
          const stats = await fs.stat(path.join(downloadDir, file)).catch(() => null);
          if (stats && stats.mtimeMs < oneDayAgo) {
            parts.push({ name: file, size: stats.size, mtime: stats.mtime });
          }
        }
      }
      return parts;
    })()
  ]);

  return {
    expiredShares: expiredShares.map(s => ({
      id: s.id,
      fileName: s.file?.name || '未知文件',
      expiresAt: s.expiresAt,
      size: s.file?.size.toString() || '0'
    })),
    zombieParts: zombieParts.map(p => ({
      name: p.name,
      size: p.size.toString(),
      mtime: p.mtime
    }))
  };
}
