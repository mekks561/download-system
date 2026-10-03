import path from 'node:path';
import {
  MYSQL_CLIENT_HINT,
  dumpToGzip,
  hasCommand,
  loadDotenv,
  parseDatabaseUrl,
  redactDatabaseUrl,
  timestampForFile,
} from './db-utils';

/**
 * db:export —— 把 MySQL 数据库导出为 gzip 压缩的 SQL 备份（spec §5.4，S3 Task 3）。
 *
 * 与 plan 草稿的差异（按仓库 Windows 实况修正）：
 *   - 不用 `mysqldump | gzip > file` 的 Unix shell 管道；
 *     mysqldump 以 Node spawn 运行，dump 内容在 Node 内经 zlib 流式 gzip 后落盘，
 *     Windows 上无需 gzip.exe（宿主机仍需 mysqldump），且大库不占整份内存。
 *   - 密码通过 MYSQL_PWD 环境变量传递，不进命令行参数（不进进程列表）。
 *
 * 输出文件默认落在 apps/api/backup-YYYYMMDD-HHMMSS.sql.gz（该模式已在 .gitignore）。
 */

// 经 pnpm script 运行时 cwd 固定为 apps/api（与 gen-openapi.ts 既有约定一致）。
const API_DIR = process.cwd();
const ENV_PATH = path.join(API_DIR, '.env');

const HELP = `db:export —— 导出 MySQL 数据库为 backup-<时间戳>.sql.gz

用法:
  pnpm db:export [输出文件]
  也可用环境变量 OUT 指定输出路径（相对路径相对当前目录解析）。

要求:
  - DATABASE_URL（apps/api/.env 或环境变量），形如 mysql://user:pass@host:port/db
  - 宿主机 PATH 中存在 mysqldump（没有时脚本会打印安装/Docker 替代指引，不会抛堆栈）
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  if (args.includes('-h') || args.includes('--help')) {
    process.stdout.write(HELP);
    return;
  }

  loadDotenv(ENV_PATH);

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL 未配置（apps/api/.env 或环境变量）');
  }
  const { db, host, port } = parseDatabaseUrl(rawUrl);

  if (!hasCommand('mysqldump')) {
    throw new Error('PATH 中未找到 mysqldump。\n' + MYSQL_CLIENT_HINT);
  }

  // 默认备份固定落在 apps/api/（.gitignore 已忽略）；显式路径按 shell 当前目录解析。
  const explicit = args[0] ?? process.env.OUT;
  const outPath = explicit
    ? path.isAbsolute(explicit)
      ? explicit
      : path.resolve(process.cwd(), explicit)
    : path.join(API_DIR, `backup-${timestampForFile()}.sql.gz`);

  console.log(`导出中: ${db} @ ${host}:${port}（${redactDatabaseUrl(rawUrl)}）`);
  console.log(`输出:   ${outPath}`);

  const { size, rawBytes } = await dumpToGzip(rawUrl, outPath);
  console.log(
    `✓ 导出完成：${path.basename(outPath)}（${(size / 1024).toFixed(1)} KB，未压缩 ${rawBytes} 字节）`,
  );
}

main().catch((err: unknown) => {
  console.error('[db:export] 失败:', err instanceof Error ? err.message : err);
  process.exit(1);
});
