import WebTorrent from 'webtorrent';
import magnet from 'magnet-uri';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { downloadRoot } from './download-engine.service';
import { emitDownloadProgress, emitDownloadComplete, emitDownloadFailed } from '../config/socket';
import { recordDownloadActivity } from './activity.service';
import { getSettings } from './settings.service';
import { pluginHost } from '../config/plugin-host';

// 单例客户端，避免重复创建资源占用
let client: WebTorrent.Instance | null = null;

// 进度写库最小间隔（毫秒）
const DB_UPDATE_INTERVAL_MS = 1000;
// 进度写库最小增量（字节）
const DB_UPDATE_BYTES = 2 << 20; // 2MB

interface TorrentJob {
  downloadId: number;
  userId: number;
  torrent: WebTorrent.Torrent;
  lastDbAt: number;
  lastDbBytes: number;
}

const jobs = new Map<number, TorrentJob>();

function getClient(): WebTorrent.Instance {
  if (!client) {
    client = new WebTorrent();
    client.on('error', (err) => {
      console.error('[torrent-engine] 全局错误:', err);
    });
    
    // 应用全局限速
    void applyGlobalSpeedLimit();
  }
  return client;
}

export async function applyGlobalSpeedLimit() {
  if (!client) return;
  const settings = await getSettings();
  if (settings.globalSpeedLimit > 0) {
    client.throttleDownload(settings.globalSpeedLimit);
  } else {
    client.throttleDownload(-1); // -1 means no limit in some versions, or just use a very large number
  }
}

/**
 * 解析磁力链接或种子文件的元数据
 */
export async function parseMetadata(uri: string | Buffer): Promise<{
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
      reject(new AppError('TIMEOUT', 408, '解析种子元数据超时，请检查网络或种子文件有效性'));
    }, 30000);

    c.add(uri, { announce: [] }, (torrent) => {
      clearTimeout(timeout);
      
      const result = {
        name: torrent.name,
        infoHash: torrent.infoHash,
        files: torrent.files.map(f => ({
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

/**
 * 启动下载任务
 */
export async function startTorrent(id: number, userId: number, url: string) {
  if (jobs.has(id)) return;

  // 获取任务元数据，看是否有选择性下载的要求
  const dbRecord = await prisma.download.findUnique({ where: { id } });
  const metadata = dbRecord?.metadata as any;
  const selectedIndices = metadata?.selectedFiles as number[] | undefined;
  const customAnnounce = metadata?.announce as string[] | undefined;

  const c = getClient();
  const root = downloadRoot();

  // 处理 base64 种子文件
  let torrentSource: string | Buffer = url;
  if (url.startsWith('data:application/x-bittorrent;base64,')) {
    torrentSource = Buffer.from(url.split(',')[1], 'base64');
  }

  c.add(torrentSource, { path: root, announce: customAnnounce }, (torrent) => {
    // 处理选择性下载
    if (selectedIndices && selectedIndices.length > 0) {
      // 先全部取消选择
      torrent.deselect(0, torrent.pieces.length - 1, 0);
      // 再勾选需要的文件
      selectedIndices.forEach(idx => {
        if (torrent.files[idx]) {
          torrent.files[idx].select();
        }
      });
    }

    const job: TorrentJob = {
      downloadId: id,
      userId,
      torrent,
      lastDbAt: Date.now(),
      lastDbBytes: 0,
    };
    jobs.set(id, job);

    torrent.on('download', (bytes) => {
      updateDbProgress(job);
    });

    torrent.on('done', async () => {
      await handleDone(job);
    });

    torrent.on('error', async (err) => {
      await handleError(job, err);
    });
  });

  await prisma.download.update({
    where: { id },
    data: { status: 'downloading', speed: BigInt(0) },
  });
}

/**
 * 暂停任务
 */
export async function pauseTorrent(id: number, userId: number) {
  const job = jobs.get(id);
  if (job) {
    job.torrent.destroy();
    jobs.delete(id);
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
  const job = jobs.get(id);
  if (job) {
    job.torrent.destroy();
    jobs.delete(id);
  }
  await prisma.download.update({
    where: { id, userId },
    data: { status: 'cancelled', speed: BigInt(0) },
  });
}

function updateDbProgress(job: TorrentJob, force = false) {
  const { torrent, downloadId, userId } = job;
  const now = Date.now();
  const downloaded = torrent.downloaded;

  if (
    !force &&
    now - job.lastDbAt < DB_UPDATE_INTERVAL_MS &&
    downloaded - job.lastDbBytes < DB_UPDATE_BYTES
  ) {
    return;
  }

  const speed = Math.round(torrent.downloadSpeed);
  const progress = Math.min(100, Math.round(torrent.progress * 10000) / 100);
  const peers = torrent.numPeers;

  job.lastDbAt = now;
  job.lastDbBytes = downloaded;

  emitDownloadProgress(userId, downloadId, progress, 'downloading', speed, peers);

  void prisma.download.update({
    where: { id: downloadId },
    data: {
      progress,
      downloadedBytes: BigInt(downloaded),
      totalBytes: BigInt(torrent.length),
      speed: BigInt(speed),
    },
  }).catch(() => undefined);
}

async function handleDone(job: TorrentJob) {
  const { torrent, downloadId, userId } = job;
  
  emitDownloadComplete(userId, downloadId, torrent.name);

  // 广播插件事件
  void pluginHost.broadcast('DOWNLOAD_COMPLETE', {
    taskId: downloadId.toString(),
    url: torrent.magnetURI,
    filename: torrent.name,
    userId,
    path: torrent.path, // 种子下载通常是一个目录或主文件路径
  });

  await prisma.download.update({
    where: { id: downloadId },
    data: {
      status: 'completed',
      progress: 100,
      downloadedBytes: BigInt(torrent.length),
      totalBytes: BigInt(torrent.length),
      speed: BigInt(0),
      completedAt: new Date(),
    },
  });

  await recordDownloadActivity({
    userId,
    filename: torrent.name,
    status: 'completed',
    size: torrent.length,
  });

  jobs.delete(downloadId);
  torrent.destroy();
}

async function handleError(job: TorrentJob, err: Error | string) {
  const { downloadId, userId, torrent } = job;
  const message = typeof err === 'string' ? err : err.message;

  emitDownloadFailed(userId, downloadId, message);

  await prisma.download.update({
    where: { id: downloadId },
    data: { status: 'error', speed: BigInt(0) },
  });

  await recordDownloadActivity({
    userId,
    filename: torrent.name || '未知种子',
    status: 'error',
    url: torrent.magnetURI,
  });

  jobs.delete(downloadId);
  torrent.destroy();
}
