/**
 * 活动流写入（activities 表）。
 *
 * 背景
 * ----
 * `stats.service.getActivities()` 会把 activities 表映射成前端「最近活动」列表
 * （type → download/upload，并读取 metadata.filename / metadata.status / metadata.size），
 * 但全库此前**只有读、没有写**——表建好了却永远是空的，前端列表恒为空数组。
 * 本模块补上写入侧，首个接入方是下载引擎：任务进入终态（completed / error）时落一条记录。
 *
 * 设计约束
 * --------
 * - **绝不抛错**：活动流是旁路记录，写失败不能影响主流程（落盘、状态更新）。
 *   调用方无需 try/catch，失败仅打一条 warn。
 * - **字段截断**：description ≤ 500、type ≤ 50（对齐 DB VarChar 与 shared zod schema）。
 *   文件名理论上可达 255 字符，拼上前缀后可能溢出，故一律按**码点**截断，
 *   避免把 emoji 之类的代理对切成半个字符（MySQL utf8mb4 会因此报错）。
 * - **BigInt / Infinity 不进 metadata**：Prisma 的 Json 列不接受 BigInt，
 *   JSON.stringify 也会把 Infinity/NaN 变成 null，故递归归一化。
 * - **控制字符剔除**：文件名可能带 \u0000 等，MySQL 文本列遇到会截断或报错。
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

/** 与 packages/shared/src/schemas/activity.ts 及 DB 列宽保持一致 */
export const MAX_ACTIVITY_TYPE = 50;
export const MAX_ACTIVITY_DESCRIPTION = 500;

export interface RecordActivityInput {
  userId: number;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/** 剔除 Unicode 控制字符（C0 / C1），并去首尾空白 */
function stripControlChars(value: string): string {
  return value.replace(/\p{Cc}/gu, '').trim();
}

/** 按码点截断；超长时末尾补省略号，保证结果长度恰好 ≤ max */
function clampText(value: string, max: number): string {
  const chars = Array.from(value);
  if (chars.length <= max) return value;
  if (max <= 1) return chars.slice(0, Math.max(0, max)).join('');
  return chars.slice(0, max - 1).join('') + '…';
}

/** 递归把任意值转成 JSON 安全形态（BigInt→number，非法数值/函数/符号→null，丢弃 undefined） */
function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') {
    // 超出安全整数范围时退化为字符串，避免精度静默丢失
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'function' || typeof value === 'symbol') return null;
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (inner === undefined) continue;
      out[key] = toJsonSafe(inner);
    }
    return out;
  }
  return value;
}

/**
 * 写一条活动记录。
 *
 * **永不抛错** —— 这是本函数的契约，调用方可以直接 `await` 而不必包 try/catch。
 * 描述为空（清洗后）时视为无意义，静默跳过且不写库。
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  const description = clampText(stripControlChars(input.description), MAX_ACTIVITY_DESCRIPTION);
  if (description.length === 0) return;

  const type = clampText(stripControlChars(input.type) || 'unknown', MAX_ACTIVITY_TYPE);

  try {
    await prisma.activity.create({
      data: {
        userId: input.userId,
        type,
        description,
        ...(input.metadata
          ? { metadata: toJsonSafe(input.metadata) as Prisma.InputJsonValue }
          : {}),
      },
    });
  } catch (err) {
    console.warn(
      '[activity] 写入失败（已忽略，不影响主流程）:',
      err instanceof Error ? err.message : err,
    );
  }
}

export interface DownloadActivityInput {
  userId: number;
  /** 期望的文件名（失败时用）或最终落盘名（成功时用） */
  filename: string;
  status: 'completed' | 'error';
  /** 成功时的最终字节数，允许传 BigInt（Prisma 侧就是 BigInt） */
  size?: number | bigint;
  /** 失败时把源 URL 记进 metadata，便于排查 */
  url?: string;
}

/**
 * 构造「下载完成 / 下载失败」的活动载荷（纯函数，边界行为全部可单测）。
 *
 * - 成功：description 带「下载完成：<名>」，metadata 含 filename/status/size
 * - 失败：description 带「下载失败：<名>」，metadata 含 filename/status/url（无 size）
 * - 文件名为空或全为控制字符 → 回落成「(未命名)」，避免产生「下载完成：」这种残句
 */
export function buildDownloadActivity(input: DownloadActivityInput): RecordActivityInput {
  const done = input.status === 'completed';
  const filename = stripControlChars(input.filename) || '(未命名)';

  const metadata: Record<string, unknown> = { filename, status: input.status };
  if (done && input.size !== undefined) metadata.size = input.size;
  if (!done && input.url) metadata.url = input.url;

  return {
    userId: input.userId,
    type: 'download',
    description: done ? `下载完成：${filename}` : `下载失败：${filename}`,
    metadata,
  };
}

/** 便捷包装：构造 + 写入一步到位（同样永不抛错） */
export async function recordDownloadActivity(input: DownloadActivityInput): Promise<void> {
  await recordActivity(buildDownloadActivity(input));
}
