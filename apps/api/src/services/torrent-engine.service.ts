import { TorrentEngine } from '@dm/engine';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { downloadRoot } from './download-engine.service';
import { emitDownloadProgress, emitDownloadComplete, emitDownloadFailed } from '../config/socket';
import { recordDownloadActivity } from './activity.service';
import { getSettings } from './settings.service';
import { pluginHost } from '../config/plugin-host';

const engines = new Map<number, TorrentEngine>();

export async function applyGlobalSpeedLimit() {
  // Global limit is now handled by individual engines or global client in @dm/engine
}

/**
 * 解析磁力链接或种子文件的元数据
 */
export async function parseMetadata(uri: string | Buffer) {
  try {
    return await TorrentEngine.parseMetadata(uri);
  } catch (err: any) {
    throw new AppError('TIMEOUT', 408, err.message || '解析种子元数据超时');
  }
}

/**
 * 启动下载任务
 */
export async function startTorrent(id: number, userId: number, url: string) {
  if (engines.has(id)) return;

  const dbRecord = await prisma.download.findUnique({ where: { id } });
  const metadata = dbRecord?.metadata as any;
  const selectedIndices = metadata?.selectedFiles as number[] | undefined;
  const customAnnounce = metadata?.announce as string[] | undefined;

  const root = downloadRoot();
  const engine = new TorrentEngine(root);
  engines.set(id, engine);

  const settings = await getSettings();

  engine.on('progress', (p) => {
    emitDownloadProgress(userId, id, p.progress, 'downloading', p.speed, p.peers);
    void prisma.download.update({
      where: { id },
      data: {
        progress: p.progress,
        downloadedBytes: BigInt(p.downloadedBytes),
        totalBytes: BigInt(p.totalBytes),
        speed: BigInt(p.speed),
      },
    }).catch(() => undefined);
  });

  engine.on('complete', async (c) => {
    emitDownloadComplete(userId, id, c.filename);
    void pluginHost.broadcast('DOWNLOAD_COMPLETE', {
      taskId: id.toString(),
      url,
      filename: c.filename,
      userId,
      path: c.path,
    });

    await prisma.download.update({
      where: { id },
      data: {
        status: 'completed',
        progress: 100,
        downloadedBytes: BigInt(c.size),
        totalBytes: BigInt(c.size),
        speed: BigInt(0),
        completedAt: new Date(),
      },
    });

    await recordDownloadActivity({
      userId,
      filename: c.filename,
      status: 'completed',
      size: c.size,
    });

    engines.delete(id);
  });

  engine.on('error', async (err) => {
    const message = typeof err === 'string' ? err : err.message;
    emitDownloadFailed(userId, id, message);
    await prisma.download.update({
      where: { id },
      data: { status: 'error', speed: BigInt(0) },
    });
    await recordDownloadActivity({
      userId,
      filename: dbRecord?.filename || '未知种子',
      status: 'error',
      url,
    });
    engines.delete(id);
  });

  await prisma.download.update({
    where: { id },
    data: { status: 'downloading', speed: BigInt(0) },
  });

  void engine.start({
    id,
    url,
    selectedFiles: selectedIndices,
    announce: customAnnounce,
    speedLimit: settings.globalSpeedLimit
  });
}

/**
 * 暂停任务
 */
export async function pauseTorrent(id: number, userId: number) {
  const engine = engines.get(id);
  if (engine) {
    await engine.pause();
    engines.delete(id);
  }
  await prisma.download.update({
    where: { id, userId },
    data: { status: 'paused', speed: BigInt(0) },
  });
}

/**
 * 取消任务
 */
export async function cancelTorrent(id: number, userId: number) {
  const engine = engines.get(id);
  if (engine) {
    await engine.cancel();
    engines.delete(id);
  }
  await prisma.download.update({
    where: { id, userId },
    data: { status: 'cancelled', speed: BigInt(0) },
  });
}
