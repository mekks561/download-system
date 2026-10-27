/**
 * 服务端下载引擎。
 *
 * 设计要点
 * --------
 * - Node 原生 `fetch`（undici）流式拉取，边下边写盘，不把整个文件读进内存。
 * - 落盘位置受 `DM_DOWNLOAD_ROOT` 约束（与 /api/fs 目录浏览共用同一个根）。
 * - 先写 `.<name>.part`，完成后再 rename 成正式文件名；重名自动加 " (n)" 后缀。
 * - 断点续传：暂停/中断时保留 .part，并把已下字节数写入 `resume_position`；
 *   恢复时带 `Range: bytes=<n>-`；上游不支持断点（返回 200 而非 206）则从头重下。
 * - 进度节流写库（时间 + 字节双阈值），避免高速下载把 MySQL 打满。
 * - 运行态保存在**进程内存**（jobs Map）：与限流/缓存同样的单实例假设。
 *   进程重启后内存态丢失，`recoverInterrupted()` 会把残留的 downloading 记录
 *   回落成 paused，避免出现永远卡在「下载中」的幽灵任务。
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { HttpEngine } from '@dm/engine';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { recordDownloadActivity } from './activity.service.js';
import { emitDownloadProgress, emitDownloadComplete, emitDownloadFailed } from '../config/socket.js';
import { getSettings } from './settings.service.js';
import { pluginHost } from '../config/plugin-host.js';
import { processDownloadAi } from './ai-processing.service.js';

/** 下载根目录（与 /api/fs 的目录浏览保持一致） */
export function downloadRoot(): string {
  const configured = process.env.DM_DOWNLOAD_ROOT?.trim();
  return resolve(configured && configured.length > 0 ? configured : join(process.cwd(), 'downloads'));
}

const engines = new Map<number, HttpEngine>();

function sanitizeFilename(raw: string): string {
  const base = basename(raw).replace(/\p{Cc}/gu, '').trim();
  return (base.length > 0 ? base : 'download').slice(0, 200);
}

function partPathFor(root: string, filename: string): string {
  return join(root, `.${sanitizeFilename(filename)}.part`);
}

function safeUnlink(path: string): void {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {}
}

async function loadOwned(id: number, userId: number) {
  const row = await prisma.download.findFirst({ where: { id, userId } });
  if (!row) throw new AppError('NOT_FOUND', 404, '下载记录不存在');
  return row;
}

/** 启动 / 恢复下载（幂等：已在跑则直接返回） */
export async function start(id: number, userId: number): Promise<void> {
  const row = await loadOwned(id, userId);
  if (row.status === 'completed') throw new AppError('CONFLICT', 409, '任务已完成，无法重新开始');
  if (engines.has(id)) return;

  const root = downloadRoot();
  const partPath = partPathFor(root, row.filename);
  let resumeAt = 0;
  if (existsSync(partPath)) {
    resumeAt = Number(statSync(partPath).size);
  }

  const engine = new HttpEngine(root);
  engines.set(id, engine);

  const settings = await getSettings();
  const globalSpeedLimit = settings.speedLimitKBps * 1024;
  const activeHttpJobs = Array.from(engines.keys()).length;
  const limitPerJob = globalSpeedLimit > 0 
    ? Math.max(1024, Math.floor(globalSpeedLimit / Math.max(1, activeHttpJobs)))
    : 0;

  engine.on('progress', (p) => {
    const progress = p.totalBytes > 0 ? Math.round((p.downloadedBytes / p.totalBytes) * 10000) / 100 : 0;
    emitDownloadProgress(userId, id, progress, 'downloading', p.speed);
    void prisma.download.update({
      where: { id },
      data: {
        progress,
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
      url: row.url,
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
        resumePosition: BigInt(0),
        completedAt: new Date(),
      },
    });

    await recordDownloadActivity({
      userId,
      filename: c.filename,
      status: 'completed',
      size: c.size,
    });

    // 触发异步 AI 处理
    void processDownloadAi(id);

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
      filename: row.filename,
      status: 'error',
      url: row.url,
    });
    engines.delete(id);
  });

  engine.on('paused', async (p) => {
    await prisma.download.update({
      where: { id },
      data: {
        status: 'paused',
        speed: BigInt(0),
        resumePosition: BigInt(p.downloadedBytes),
        downloadedBytes: BigInt(p.downloadedBytes),
      },
    });
    engines.delete(id);
  });

  engine.on('cancelled', async () => {
    await prisma.download.update({
      where: { id },
      data: { status: 'cancelled', speed: BigInt(0) },
    });
    engines.delete(id);
  });

  await prisma.download.update({
    where: { id },
    data: { status: 'downloading', speed: BigInt(0), resumePosition: BigInt(resumeAt) },
  });

  void engine.start({
    id,
    url: row.url,
    filename: row.filename,
    resumeFrom: resumeAt,
    speedLimit: limitPerJob
  });
}

/** 暂停：中断拉流并保留 .part，供续传 */
export async function pause(id: number, userId: number): Promise<void> {
  const row = await loadOwned(id, userId);
  const engine = engines.get(id);
  if (engine) {
    await engine.pause();
    return;
  }
  await prisma.download.update({
    where: { id },
    data: { status: 'paused', speed: BigInt(0), resumePosition: row.downloadedBytes },
  });
}

/** 取消：中断并删除半成品 .part */
export async function cancel(id: number, userId: number): Promise<void> {
  await loadOwned(id, userId);
  const engine = engines.get(id);
  if (engine) {
    await engine.cancel();
    return;
  }
  const row = await prisma.download.findFirst({ where: { id, userId } });
  if (row) safeUnlink(partPathFor(downloadRoot(), row.filename));
  await prisma.download.update({
    where: { id },
    data: { status: 'cancelled', speed: BigInt(0) },
  });
}

/**
 * GM 强制取消：不检查用户归属，直接中断并清理半成品。
 */
export async function forceCancel(id: number): Promise<void> {
  const row = await prisma.download.findUnique({ where: { id } });
  if (!row) throw new AppError('NOT_FOUND', 404, '下载记录不存在');

  const engine = engines.get(id);
  if (engine) {
    await engine.cancel();
    return;
  }

  safeUnlink(partPathFor(downloadRoot(), row.filename));
  await prisma.download.update({
    where: { id },
    data: { status: 'cancelled', speed: BigInt(0) },
  });
}

/** 删除记录时顺带清掉半成品（纯同步文件操作） */
export function purgeArtifacts(filename: string): void {
  safeUnlink(partPathFor(downloadRoot(), filename));
}

/** 进程启动时把上一轮残留的 downloading 回落为 paused（内存态已丢失） */
export async function recoverInterrupted(): Promise<void> {
  try {
    const result = await prisma.download.updateMany({
      where: { status: 'downloading' },
      data: { status: 'paused', speed: BigInt(0) },
    });
    if (result.count > 0) {
      console.log(`[download-engine] 启动恢复：${result.count} 个中断任务已回落为 paused`);
    }
  } catch (err) {
    console.warn('[download-engine] 启动恢复失败（不影响 API 启动）:', err);
  }
}
