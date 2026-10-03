import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  MYSQL_CLIENT_HINT,
  hasCommand,
  loadDotenv,
  parseDatabaseUrl,
  redactDatabaseUrl,
  restoreFromGzip,
} from './db-utils';

/**
 * db:import —— 把 db:export 产出的 .sql.gz 恢复进 MySQL（spec §5.4，S3 Task 4）。
 *
 * 与 plan 草稿的差异（按仓库 Windows 实况修正）：
 *   - 不用 `gunzip < file | mysql` 的 Unix 管道；
 *     文件在 Node 内经 zlib 流式 gunzip 后通过 stdin 喂给 mysql，
 *     Windows 上无需 gunzip.exe，且不把整份备份读进内存。
 *   - 密码通过 MYSQL_PWD 环境变量传递，不进命令行参数。
 *
 * 安全：备份 SQL 通常含 DROP/CREATE TABLE，导入会覆盖同名表数据。
 * 参数校验：必须给路径、文件必须存在、后缀必须 .sql.gz。
 */

// 经 pnpm script 运行时 cwd 固定为 apps/api（与 gen-openapi.ts 既有约定一致）。
const API_DIR = process.cwd();
const ENV_PATH = path.join(API_DIR, '.env');

const HELP = `db:import —— 将 backup-*.sql.gz 恢复进 DATABASE_URL 指向的 MySQL 数据库

用法:
  pnpm db:import <备份文件.sql.gz>

注意:
  - 备份中的 DROP/CREATE TABLE 语句会覆盖目标库同名表，数据以备份时点为准。
  - 要求宿主机 PATH 中存在 mysql（没有时脚本会打印安装/Docker 替代指引，不会抛堆栈）。
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  if (args.includes('-h') || args.includes('--help')) {
    process.stdout.write(HELP);
    return;
  }

  const fileArg = args[0];
  if (!fileArg) {
    console.error('用法: pnpm db:import <备份文件.sql.gz>（用 --help 查看说明）');
    process.exit(1);
  }
  if (!fileArg.toLowerCase().endsWith('.sql.gz')) {
    console.error(`[db:import] 仅接受 gzip 压缩的 SQL 备份（*.sql.gz），收到：${fileArg}`);
    process.exit(1);
  }

  const filePath = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);
  if (!existsSync(filePath)) {
    console.error(`[db:import] 文件不存在：${filePath}`);
    process.exit(1);
  }
  if (statSync(filePath).size === 0) {
    console.error(`[db:import] 文件为空：${filePath}`);
    process.exit(1);
  }

  loadDotenv(ENV_PATH);

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL 未配置（apps/api/.env 或环境变量）');
  }
  const { db, host, port } = parseDatabaseUrl(rawUrl);

  if (!hasCommand('mysql')) {
    throw new Error('PATH 中未找到 mysql。\n' + MYSQL_CLIENT_HINT);
  }

  console.log(`导入中: ${path.basename(filePath)} -> ${db} @ ${host}:${port}`);
  console.log(`目标:   ${redactDatabaseUrl(rawUrl)}`);
  console.log('⚠️  将覆盖同名表（备份 SQL 含 DROP/CREATE TABLE），Ctrl+C 尚可中止。');

  const { sqlBytes } = await restoreFromGzip(rawUrl, filePath);
  console.log(`✓ 导入完成（已执行 ${sqlBytes} 字节 SQL）。`);
}

main().catch((err: unknown) => {
  console.error('[db:import] 失败:', err instanceof Error ? err.message : err);
  process.exit(1);
});
