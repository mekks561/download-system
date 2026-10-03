import { spawn, spawnSync } from 'node:child_process';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { once } from 'node:events';
import { createGunzip, createGzip } from 'node:zlib';

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

/**
 * 构造 mysqldump 的 argv（纯函数，便于单测锁定参数）。
 * 不含密码：密码只通过 MYSQL_PWD 环境变量传递，避免命令行告警与进程列表泄漏。
 *
 * - --single-transaction：InnoDB 一致性快照，不锁表
 * - --quick：大表逐行流式输出，不把整表拉进客户端内存
 * - --no-tablespaces：8.0 下免去对 PROCESS 特权的要求（root 无害，低权账号必需）
 */
export function buildMysqldumpArgs(p: ParsedDatabaseUrl): string[] {
  return [
    '-u',
    p.user,
    '-h',
    p.host,
    '-P',
    String(p.port),
    '--single-transaction',
    '--quick',
    '--no-tablespaces',
    p.db,
  ];
}

/** 构造 mysql 客户端导入用 argv（纯函数）。密码同样只走 MYSQL_PWD。 */
export function buildMysqlArgs(p: ParsedDatabaseUrl): string[] {
  return ['-u', p.user, '-h', p.host, '-P', String(p.port), p.db];
}

/** 以 MYSQL_PWD 注入密码的子进程公共 spawn 选项 */
function clientSpawnOpts(pass: string): {
  env: NodeJS.ProcessEnv;
  stdio: ['ignore' | 'pipe', 'pipe', 'pipe'];
  windowsHide: boolean;
} {
  return {
    env: { ...process.env, MYSQL_PWD: pass },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  };
}

/**
 * 运行 mysqldump 并流式压缩落盘：mysqldump stdout → zlib.createGzip → 文件。
 *
 * 全程不经过 Unix shell 管道，Windows 上无需 gzip.exe（宿主机仍需 mysqldump），
 * 且不把整个 dump 缓冲进内存，大库也只有管道级内存占用。
 *
 * 失败约定（调用方直接展示 message）：
 *  - 子进程非零退出 / spawn 失败 / dump 为空 → reject，并删除半截输出文件
 */
export async function dumpToGzip(
  rawUrl: string,
  outPath: string,
): Promise<{ size: number; rawBytes: number }> {
  const p = parseDatabaseUrl(rawUrl);
  const child = spawn('mysqldump', buildMysqldumpArgs(p), clientSpawnOpts(p.pass));
  const stdout = child.stdout;
  const stderr = child.stderr;
  if (!stdout || !stderr) {
    throw new Error('mysqldump 子进程管道建立失败（stdio 配置异常）');
  }
  stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));

  const gzip = createGzip();
  const out = createWriteStream(outPath);
  // 失败路径会主动 destroy 该流再删文件；destroy/迟到的写入可能带 error，吞掉避免进程崩溃。
  out.on('error', () => undefined);
  let rawBytes = 0;
  stdout.on('data', (chunk: Buffer) => {
    rawBytes += chunk.length;
  });
  stdout.pipe(gzip).pipe(out);

  // 任何失败都必须先拆除整条管道并删掉半截文件（Windows 上文件句柄不关删不掉）。
  const discard = (): void => {
    stdout.destroy();
    gzip.destroy();
    out.destroy();
    rmSync(outPath, { force: true });
  };

  try {
    // close 可能早于文件 flush，先等退出码，再显式等写流结束，绝不截半截文件。
    await waitChildClose(child, 'mysqldump');
    await once(out, 'finish');
  } catch (err) {
    discard();
    throw err;
  }

  if (rawBytes === 0) {
    discard();
    throw new Error('mysqldump 输出为空，已放弃生成备份（请检查上方服务端报错）');
  }

  return { size: statSync(outPath).size, rawBytes };
}

/**
 * 从 .sql.gz 流式恢复：文件 → zlib.createGunzip → mysql stdin。
 *
 * 同样不依赖 shell / gunzip.exe，不把整个备份缓冲进内存。
 * gzip 损坏或文件读取失败时立即终止 mysql 子进程并 reject（消息面向终端用户）。
 */
export async function restoreFromGzip(
  rawUrl: string,
  inPath: string,
): Promise<{ sqlBytes: number }> {
  const p = parseDatabaseUrl(rawUrl);
  const child = spawn('mysql', buildMysqlArgs(p), clientSpawnOpts(p.pass));
  const stdin = child.stdin;
  const stderr = child.stderr;
  if (!stdin || !stderr) {
    throw new Error('mysql 子进程管道建立失败（stdio 配置异常）');
  }
  stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));
  // mysql 提前退出会让 stdin 触发 EPIPE；最终以子进程退出码为准，这里吞掉即可。
  stdin.on('error', () => undefined);

  const input = createReadStream(inPath);
  const gunzip = createGunzip();
  let sqlBytes = 0;
  gunzip.on('data', (chunk: Buffer) => {
    sqlBytes += chunk.length;
  });
  input.pipe(gunzip).pipe(stdin);

  // 解压 / 读文件失败：先杀子进程，再用可读消息 reject（不等 close）。
  const pipelineFailed = new Promise<never>((_, reject) => {
    const fail = (err: Error, label: string): void => {
      child.kill();
      reject(new Error(`${label}：${inPath}（${err.message}）`));
    };
    gunzip.on('error', (err: Error) =>
      fail(err, '备份无法以 gzip 解压（文件可能损坏或并非 .sql.gz）'),
    );
    input.on('error', (err: Error) => fail(err, '读取备份文件失败'));
  });

  await Promise.race([waitChildClose(child, 'mysql'), pipelineFailed]);

  if (sqlBytes === 0) {
    throw new Error('解压后的 SQL 为空，已中止导入');
  }
  return { sqlBytes };
}

/** 等子进程结束：close 非零 / spawn error 都转成带工具名的可读错误。 */
async function waitChildClose(
  child: ReturnType<typeof spawn>,
  bin: string,
): Promise<void> {
  // 不能用 events.once(child, 'close')：Node 对 'error' 事件有特殊处理，
  // once('close') 在 spawn ENOENT 时会用原始 err 抢先 reject，包不住工具名。
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    child.once('close', (code: number | null) => {
      if (settled) return;
      settled = true;
      if (code === 0) resolve();
      else reject(new Error(`${bin} 执行失败（退出码 ${code ?? 'unknown'}）`));
    });
    child.once('error', (err: Error) => {
      if (settled) return;
      settled = true;
      reject(new Error(`${bin} 启动失败：${err.message}`));
    });
  });
}

/** 缺少 mysql 客户端工具时给出的跨平台安装/替代指引 */
export const MYSQL_CLIENT_HINT =
  [
    '宿主机 PATH 中找不到所需的 MySQL 客户端工具。可选方案：',
    '  1) 安装 MySQL Client 并加入 PATH：',
    '       Windows: MySQL Installer 勾选 Client Programs，或安装完整 MySQL Server',
    '       macOS:   brew install mysql-client',
    '       Debian:  sudo apt-get install mysql-client',
    '  2) 若数据库跑在 Docker 中，直接用容器内工具（无需本机安装）：',
    '       docker exec <container> mysqldump -u <user> -p<db名>  # 导出',
    '       docker exec -i <container> mysql -u <user> -p<db名>   # 导入',
  ].join('\n');

/** 生成备份文件名用的本地时间戳：YYYYMMDD-HHMMSS（无冒号，全平台文件名安全） */
export function timestampForFile(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
