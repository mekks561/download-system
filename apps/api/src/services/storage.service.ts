import { constants } from 'node:fs';
import { access, mkdir, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { StorageListing } from '@dm/shared';
import { AppError } from '../utils/errors.js';

/**
 * 服务端目录浏览（下载目录选择器的数据来源）。
 *
 * 背景：浏览器无法调起系统目录选择框，更拿不到服务端路径；而下载管理器跑在
 * 服务器/NAS 上，「下载目录」必然是服务端路径。所以 Web 形态下只能由后端列出
 * 自己的目录树供用户逐层点选。
 *
 * 安全边界（本文件是唯一的信任边界，controller 不做任何路径处理）：
 * 1. **根目录约束**：一切浏览都被限制在 `DM_DOWNLOAD_ROOT`（默认 `<cwd>/downloads`）内，
 *    越界一律 403，不泄露根目录之外的任何信息（连「是否存在」都不回答）。
 * 2. **穿越防护**：先用 `resolve()` 归一化再判定前缀，`..`、`%2e%2e`、绝对路径注入
 *    都在同一处被拦下；前缀判定用 `path.relative` 而非字符串 startsWith，
 *    避免 `/data/downloads-evil` 被误判为在 `/data/downloads` 之内。
 * 3. **符号链接逃逸**：归一化只处理字面路径，软链接可以指向根目录之外，
 *    因此最终还要对 `realpath()` 结果再判定一次。
 * 4. 只列目录，不列文件、不返回大小/权限等元信息，减少无关信息暴露面。
 */

/** 单次最多返回的子目录数，防止超大目录把响应撑爆 */
const MAX_ENTRIES = 500;

/**
 * 可浏览根目录（绝对路径）。
 *
 * 未配置 `DM_DOWNLOAD_ROOT` 时回落到 `<cwd>/downloads`，与 `.env.example`
 * 里 `UPLOAD_PATH=./uploads` 的写法保持同一套惯例。
 */
export function resolveDownloadRoot(): string {
  const configured = process.env.DM_DOWNLOAD_ROOT?.trim();
  return resolve(configured && configured.length > 0 ? configured : join(process.cwd(), 'downloads'));
}

/** target 是否位于 root 之内（含 root 自身） */
function isInside(root: string, target: string): boolean {
  if (target === root) return true;
  const rel = relative(root, target);
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * 首次浏览时确保根目录存在。
 *
 * 刻意允许这个「GET 有副作用」：根目录是本应用自己的下载落点，不存在时自动建出来
 * 比让选择器报错更合理（用户此时正是要选它）。创建范围仅限这一个目录。
 */
async function ensureRoot(root: string): Promise<void> {
  try {
    const info = await stat(root);
    if (!info.isDirectory()) {
      throw new AppError('INVALID_PATH', 400, '下载根目录被占用（同名文件已存在）');
    }
    return;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  try {
    await mkdir(root, { recursive: true });
  } catch (err) {
    throw new AppError(
      'INVALID_PATH',
      400,
      `无法创建下载根目录（请检查容器是否挂载了该路径）：${(err as Error).message}`,
    );
  }
}

/**
 * 把请求参数归一化成「位于根目录内的绝对路径」。
 *
 * 相对路径按「相对根目录」解释（前端面包屑传递短路径更省字节），绝对路径则原样
 * 归一化后校验范围。
 */
function normalizeRequested(root: string, input: string | undefined): string {
  const raw = input?.trim();
  if (!raw || raw === '/' || raw === '.') return root;

  // Windows 客户端粘贴 `D:\Downloads` 时，服务端（Linux）不认这个盘符，
  // 会被拼成 root/D:\Downloads —— 交由后续 stat 报 404，而不是静默当成相对路径放行。
  const candidate = isAbsolute(raw) ? resolve(raw) : resolve(root, raw);
  if (!isInside(root, candidate)) {
    throw new AppError('FORBIDDEN', 403, '仅允许浏览下载根目录内的路径');
  }
  return candidate;
}

/** 目录是否存在/是否真是目录，并把软链接解析结果再校验一次范围 */
async function resolveExistingDirectory(root: string, target: string): Promise<void> {
  let resolvedReal: string;
  try {
    resolvedReal = await realpath(target);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new AppError('NOT_FOUND', 404, '目录不存在');
    }
    throw err;
  }

  // 软链接可以把人带出根目录，字面路径合法不代表真实路径合法
  const realRoot = await realpath(root).catch(() => root);
  if (!isInside(realRoot, resolvedReal)) {
    throw new AppError('FORBIDDEN', 403, '仅允许浏览下载根目录内的路径');
  }

  const info = await stat(resolvedReal);
  if (!info.isDirectory()) {
    throw new AppError('INVALID_PATH', 400, '目标路径不是目录');
  }
}

/** 当前进程对目录是否有写权限（向导「目录不可写」提示的事实来源） */
async function isWritable(dir: string): Promise<boolean> {
  try {
    await access(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** 子目录（软链接指向目录时也算，指向文件则跳过；按名称做码点序排序保证输出稳定） */
async function listSubdirectories(
  dir: string,
): Promise<{ directories: { name: string; path: string }[]; truncated: boolean }> {
  const entries = await readdir(dir, { withFileTypes: true });
  const dirs: { name: string; path: string }[] = [];

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      dirs.push({ name: entry.name, path: full });
      continue;
    }
    if (entry.isSymbolicLink()) {
      const ok = await stat(full)
        .then((info) => info.isDirectory(), () => false);
      if (ok) dirs.push({ name: entry.name, path: full });
    }
  }

  dirs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { directories: dirs.slice(0, MAX_ENTRIES), truncated: dirs.length > MAX_ENTRIES };
}

/**
 * 校验一个「用户选定的下载目录」并返回归一化后的绝对路径。
 *
 * 供设置保存（PUT /api/settings/download）复用浏览时的同一套边界检查：
 * 越界、不存在、不是目录都直接拒，避免把配置写成一个下载引擎根本用不了、
 * 或指向根目录之外的值。返回归一化路径，调用方存这个值而不是原始输入。
 *
 * 抛出：403（越界/软链接逃逸）、404（不存在）、400（不是目录 / 不可写）。
 */
export async function assertUsableDownloadDir(input: string): Promise<string> {
  const root = resolveDownloadRoot();
  await ensureRoot(root);

  const target = normalizeRequested(root, input);
  await resolveExistingDirectory(root, target);

  if (!(await isWritable(target))) {
    throw new AppError('INVALID_PATH', 400, '该目录不可写，请换一个目录');
  }
  return target;
}

/**
 * 列出某个目录的子目录。`input` 缺省表示根目录。
 *
 * 抛出：403（越界/软链接逃逸）、404（目录不存在）、400（路径不是目录 / 根目录被占用）。
 */
export async function listDirectories(input: string | undefined): Promise<StorageListing> {
  const root = resolveDownloadRoot();
  await ensureRoot(root);

  const target = normalizeRequested(root, input);
  await resolveExistingDirectory(root, target);

  const { directories, truncated } = await listSubdirectories(target);
  const parent = target === root ? null : dirname(target);

  return {
    root,
    path: target,
    parent,
    writable: await isWritable(target),
    directories,
    truncated,
  };
}
