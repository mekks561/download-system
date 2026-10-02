import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * db:reset / db:export / db:import 三个 CLI 脚本共享的纯函数工具集。
 *
 * 刻意保持「无副作用、易测试」：URL 解析、yes 判定、.env 解析都在这里，
 * 对应单测见 db-utils.test.ts；子进程编排留在各自主脚本里。
 */

export interface ParsedDatabaseUrl {
  user: string;
  pass: string;
  host: string;
  port: number;
  db: string;
}

/**
 * 二次确认判定：只有（去空白、忽略大小写后）严格等于 "yes" 才算通过。
 *
 * 非交互场景下 readline 在 EOF 时可能给出 null/undefined/空串，
 * 一律视为「未确认」——取消是安全默认值，绝不默认放行破坏性操作。
 */
export function confirmYes(answer: string | null | undefined): boolean {
  return answer?.trim().toLowerCase() === 'yes';
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // 含裸 '%' 等非编码字符时，按原样返回
    return value;
  }
}

/**
 * 解析 `mysql://user:pass@host:port/db?args` 连接串。
 *
 * - 端口缺省回落 3306；允许空密码（mysql://user@host/db）
 * - userinfo 中的百分号编码会被解码（如密码含 @ : / 时必须编码）
 * - 仅接受 mysql:// 协议，缺用户名/主机/库名时抛错
 *
 * 注意：错误信息中不得回显完整 URL（可能含密码）。
 */
export function parseDatabaseUrl(url: string): ParsedDatabaseUrl {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error('DATABASE_URL 不是合法 URL，期望格式：mysql://user:pass@host:port/db');
  }

  if (parsed.protocol !== 'mysql:') {
    throw new Error(`DATABASE_URL 必须使用 mysql:// 协议（当前协议：${parsed.protocol}//）`);
  }

  const user = safeDecode(parsed.username);
  if (!user) {
    throw new Error('DATABASE_URL 缺少用户名');
  }

  const host = parsed.hostname;
  if (!host) {
    throw new Error('DATABASE_URL 缺少主机名');
  }

  const port = parsed.port ? Number(parsed.port) : 3306;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`DATABASE_URL 端口非法：${parsed.port || '(empty)'}`);
  }

  const db = parsed.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!db) {
    throw new Error('DATABASE_URL 缺少数据库名（mysql://user:pass@host:port/<db-name>）');
  }

  return { user, pass: safeDecode(parsed.password), host, port, db };
}

/**
 * 日志脱敏：把 URL 中的密码替换为 ***，供脚本向控制台安全打印目标库坐标。
 * 无密码的 URL 原样返回。
 */
export function redactDatabaseUrl(url: string): string {
  return url.replace(/\/\/([^:@/]+):([^@/]*)@/, '//$1:***@');
}

/**
 * 极简 .env 读取：KEY=VALUE，支持首尾引号、注释与空行。
 * 已存在于进程环境中的变量优先，不被 .env 覆盖。
 * 文件不存在时静默跳过（脚本可在无 .env 的环境靠真实环境变量运行）。
 */
export function loadDotenv(filePath: string): void {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/**
 * 探测系统 PATH 中是否存在某个可执行命令（mysqldump / mysql）。
 * Windows 用 `where`，POSIX 用 `which`。
 */
export function hasCommand(cmd: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(probe, [cmd], { stdio: 'ignore' });
  return result.status === 0;
}

/** 生成备份文件名用的本地时间戳：YYYYMMDD-HHMMSS（无冒号，全平台文件名安全） */
export function timestampForFile(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
