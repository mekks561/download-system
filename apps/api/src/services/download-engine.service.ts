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
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { basename, join, resolve } from 'node:path';
import Throttle from 'throttle';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { recordDownloadActivity } from './activity.service';
import { emitDownloadProgress, emitDownloadComplete, emitDownloadFailed } from '../config/socket';
import { getSettings } from './settings.service';
import { pluginHost } from '../config/plugin-host';

/** 进度写库最小间隔（毫秒） */
const DB_UPDATE_INTERVAL_MS = 700;
/** 进度写库最小增量（字节） */
const DB_UPDATE_BYTES = 1 << 20;
const USER_AGENT = 'download-manager/1.0 (+server-side-engine)';

type Intent = 'run' | 'pause' | 'cancel';

interface Job {
  downloadId: number;
  /** 归属用户：终态写活动流时用（活动流按 userId 索引） */
  userId: number;
  /** 任务声明的源 URL，失败时记进活动 metadata */
  url: string;
  /** 期望文件名（失败时用），成功时以最终落盘名为准 */
  filename: string;
  controller: AbortController | null;
  downloadedBytes: number;
  totalBytes: number;
  partPath: string;
  lastDbAt: number;
  lastDbBytes: number;
  startedAt: number;
  intent: Intent;
}

const jobs = new Map<number, Job>();

/** 下载根目录（与 /api/fs 的目录浏览保持一致） */
export function downloadRoot(): string {
  const configured = process.env.DM_DOWNLOAD_ROOT?.trim();
  return resolve(configured && configured.length > 0 ? configured : join(process.cwd(), 'downloads'));
}

function sanitizeFilename(raw: string): string {
  // \p{Cc} = Unicode 控制字符类别，覆盖 C0（U+0000–U+001F）与 C1（U+007F–U+009F）
  const base = basename(raw).replace(/\p{Cc}/gu, '').trim();
  return (base.length > 0 ? base : 'download').slice(0, 200);
}

function partPathFor(root: string, filename: string): string {
  return join(root, `.${sanitizeFilename(filename)}.part`);
}

/** 在 root 下取一个不冲突的最终文件名 */
function uniqueFinalPath(root: string, filename: string): string {
  const first = join(root, filename);
  if (!existsSync(first)) return first;
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  for (let i = 1; i < 10000; i += 1) {
    const candidate = join(root, `${stem} (${i})${ext}`);
    if (!existsSync(candidate)) return candidate;
  }
  return join(root, `${stem}-${Date.now()}${ext}`);
}

function safeUnlink(path: string): void {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {
    /* 忽略清理失败 */
  }
}

function updateDbProgress(job: Job, force = false): void {
  const now = Date.now();
  if (
    !force &&
    now - job.lastDbAt < DB_UPDATE_INTERVAL_MS &&
    job.downloadedBytes - job.lastDbBytes < DB_UPDATE_BYTES
  ) {
    return;
  }
  const bytesThisWindow = job.downloadedBytes - job.lastDbBytes;
  const timeThisWindow = Math.max(1, now - job.lastDbAt) / 1000;
  job.lastDbAt = now;
  job.lastDbBytes = job.downloadedBytes;

  const progress =
    job.totalBytes > 0
      ? Math.min(100, Math.round((job.downloadedBytes / job.totalBytes) * 10000) / 100)
      : 0;
  const speed = Math.max(0, Math.round(bytesThisWindow / timeThisWindow));

  // 实时推送进度（内存态计算结果，比写库快且不耗 DB 资源）
  emitDownloadProgress(job.userId, job.downloadId, progress, 'downloading', speed);

  void prisma.download
    .update({
      where: { id: job.downloadId },
      data: {
        progress,
        downloadedBytes: BigInt(job.downloadedBytes),
        totalBytes: BigInt(job.totalBytes),
        speed: BigInt(speed),
      },
    })
    .catch(() => undefined);
}

/** 核心下载流程：拉流 → 写 .part → rename。抛错由 execute 统一收尾 */
async function runJob(job: Job, url: string): Promise<void> {
  const root = downloadRoot();
  mkdirSync(root, { recursive: true });

  const resumeFrom = job.downloadedBytes;
  const headers: Record<string, string> = { 'user-agent': USER_AGENT };
  if (resumeFrom > 0) headers.range = `bytes=${resumeFrom}-`;

  const controller = new AbortController();
  job.controller = controller;
  job.startedAt = Date.now();
  job.lastDbAt = Date.now();
  job.lastDbBytes = resumeFrom;

  const response = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`上游返回 HTTP ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('上游未返回响应体');
  }

  // 206 = 上游接受续传；200 = 从头开始（需截断旧 .part）
  const append = resumeFrom > 0 && response.status === 206;
  const baseBytes = append ? resumeFrom : 0;
  const contentLength = Number(response.headers.get('content-length') ?? 0);

  job.downloadedBytes = baseBytes;
  job.totalBytes = contentLength > 0 ? baseBytes + contentLength : 0;
  job.lastDbBytes = baseBytes;

  const fileStream = createWriteStream(job.partPath, { flags: append ? 'a' : 'w' });
  let source = Readable.fromWeb(response.body as unknown as WebReadableStream<Uint8Array>);

  // 全局限速处理 (HTTP)
  const settings = await getSettings();
  if (settings.globalSpeedLimit > 0) {
    const activeHttpJobs = Array.from(jobs.values()).filter(j => j.intent === 'run').length;
    const limitPerJob = Math.max(1024, Math.floor(settings.globalSpeedLimit / Math.max(1, activeHttpJobs)));
    source = source.pipe(new Throttle(limitPerJob)) as unknown as Readable;
  }

  source.on('data', (chunk: Buffer) => {
    job.downloadedBytes += chunk.length;
    updateDbProgress(job);
  });

  await pipeline(source, fileStream);

  if (job.intent !== 'run') return; // 中途被暂停 / 取消

  const finalName = sanitizeFilename(basename(job.partPath).replace(/^\./, '').replace(/\.part$/, ''));
  const finalPath = uniqueFinalPath(root, finalName);
  renameSync(job.partPath, finalPath);
  const size = statSync(finalPath).size;

  emitDownloadComplete(job.userId, job.downloadId, finalName);

  // 广播插件事件
  void pluginHost.broadcast('DOWNLOAD_COMPLETE', {
    taskId: job.downloadId.toString(),
    url: job.url,
    filename: finalName,
    userId: job.userId,
    path: finalPath,
  });

  await prisma.download.update({
    where: { id: job.downloadId },
    data: {
      status: 'completed',
      progress: 100,
      downloadedBytes: BigInt(size),
      totalBytes: BigInt(size),
      speed: BigInt(0),
      resumePosition: BigInt(0),
      completedAt: new Date(),
    },
  });

  // 终态落活动流；用最终落盘名（可能因重名带了 " (n)" 后缀），与用户看到的文件一致
  await recordDownloadActivity({
    userId: job.userId,
    filename: basename(finalPath),
    status: 'completed',
    size,
  });
}

/** 统一收尾：按 intent 决定落 paused / cancelled / error，最后从注册表移除 */
async function execute(job: Job, url: string): Promise<void> {
  try {
    await runJob(job, url);
  } catch (err) {
    if (job.intent === 'pause') {
      await prisma.download
        .update({
          where: { id: job.downloadId },
          data: {
            status: 'paused',
            speed: BigInt(0),
            resumePosition: BigInt(job.downloadedBytes),
            downloadedBytes: BigInt(job.downloadedBytes),
          },
        })
        .catch(() => undefined);
    } else if (job.intent === 'cancel') {
      safeUnlink(job.partPath);
      await prisma.download
        .update({
          where: { id: job.downloadId },
          data: { status: 'cancelled', speed: BigInt(0) },
        })
        .catch(() => undefined);
    } else {
      const message = err instanceof Error ? err.message : String(err);
      emitDownloadFailed(job.userId, job.downloadId, message);
      await prisma.download
        .update({
          where: { id: job.downloadId },
          data: { status: 'error', speed: BigInt(0) },
        })
        .catch(() => undefined);
      console.warn(`[download-engine] #${job.downloadId} 失败: ${message}`);
      // 失败也是终态，记进活动流供用户回看；reason 另行落 metadata 之外的控制台
      await recordDownloadActivity({
        userId: job.userId,
        filename: job.filename,
        status: 'error',
        url: job.url,
      });
    }
  } finally {
    jobs.delete(job.downloadId);
  }
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
  if (jobs.has(id)) return;

  const root = downloadRoot();
  mkdirSync(root, { recursive: true });

  const partPath = partPathFor(root, row.filename);
  // 续传起点以磁盘上 .part 的真实大小为准：文件丢了就老实从 0 开始
  let resumeAt = 0;
  if (existsSync(partPath)) {
    resumeAt = statSync(partPath).size;
  }

  const job: Job = {
    downloadId: id,
    userId: row.userId,
    url: row.url,
    filename: row.filename,
    controller: null,
    downloadedBytes: resumeAt,
    totalBytes: Number(row.totalBytes),
    partPath,
    lastDbAt: Date.now(),
    lastDbBytes: resumeAt,
    startedAt: Date.now(),
    intent: 'run',
  };

  jobs.set(id, job);
  await prisma.download.update({
    where: { id },
    data: { status: 'downloading', speed: BigInt(0), resumePosition: BigInt(resumeAt) },
  });
  void execute(job, row.url);
}

/** 暂停：中断拉流并保留 .part，供续传 */
export async function pause(id: number, userId: number): Promise<void> {
  const row = await loadOwned(id, userId);
  const job = jobs.get(id);
  if (job) {
    job.intent = 'pause';
    job.controller?.abort();
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
  const job = jobs.get(id);
  if (job) {
    job.intent = 'cancel';
    job.controller?.abort();
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
 * 用于 GM 后台审计时发现违规下载或需要强制释放资源。
 */
export async function forceCancel(id: number): Promise<void> {
  const row = await prisma.download.findUnique({ where: { id } });
  if (!row) throw new AppError('NOT_FOUND', 404, '下载记录不存在');

  const job = jobs.get(id);
  if (job) {
    job.intent = 'cancel';
    job.controller?.abort();
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
