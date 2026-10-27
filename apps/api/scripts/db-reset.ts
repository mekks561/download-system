import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { confirmYes, loadDotenv, redactDatabaseUrl } from './db-utils.js';

/**
 * db:reset —— 本地/开发环境数据库重置脚本（spec §5.3/§5.4，S3 Task 2）。
 *
 * 流程：
 *   1. 显式二次确认（stdin 读到 "yes" 才继续；非交互 EOF / 任意非 yes 输入
 *      一律安全退出 0，绝不误删数据——CI 管道空输入也不会破坏数据库）
 *   2. `prisma migrate reset --force`（DROP + 重放全部迁移 + 重新生成 client）
 *   3. 可选 seed：仅当 SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD 非空时执行。
 *      缺失时 reset 仍算成功（exit 0），只打印如何补 seed 的指引——
 *      seed.ts 自移除硬编码口令起，缺 env 即失败是设计行为，reset 不能因此必败，
 *      脚本也绝不回退任何硬编码口令。
 *
 * Windows：全程 Node child_process，无 Unix 管道；prisma/seed 的工作目录取 apps/api。
 */

// 经 pnpm script 运行时 cwd 固定为 apps/api（与 gen-openapi.ts 既有约定一致）；
// .env、prisma schema、备份产物都以此为根。
const API_DIR = process.cwd();
const ENV_PATH = path.join(API_DIR, '.env');

const HELP = `db:reset —— 重置开发数据库（DROP 全部数据并重放迁移）

用法:
  pnpm db:reset [选项]

选项:
  --skip-seed          只重置迁移，不执行 seed
  --allow-production   允许在 NODE_ENV=production 下执行（默认拒绝，防误删生产库）
  -h, --help           显示本帮助

行为:
  1. 要求在 stdin 显式输入 yes 确认；非交互（无输入/EOF）或非 yes 输入安全退出（exit 0）
  2. 执行 prisma migrate reset --force（DROP、重放迁移并重新生成 Prisma Client）
  3. 重置成功后执行 seed（pnpm prisma:seed），seed 需要以下环境变量：
       SEED_ADMIN_PASSWORD   admin@dm.local 的密码
       SEED_USER_PASSWORD    user@dm.local 的密码
     可在 apps/api/.env 中配置，或由真实环境变量提供。
     两个变量任一为空时跳过 seed（reset 仍成功），随后可手动补跑 pnpm db:seed。
     --skip-seed 可显式跳过。
`;

function printHelpAndExit(): never {
  process.stdout.write(HELP);
  process.exit(0);
}

/**
 * 读取一行确认输入。EOF（管道直接关闭、无换行）时返回 null。
 * 不使用 readline/promises 的 question()：它在部分 Node 版本上 close 会 reject，
 * 这里要把「没读到输入」当成正常取消而非异常。
 */
function readConfirmation(): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let answered: string | null = null;
    rl.once('line', (line) => {
      answered = line;
      rl.close();
    });
    rl.once('close', () => resolve(answered));
  });
}

function seedEnvReady(): { ready: boolean; missing: string[] } {
  const missing = ['SEED_ADMIN_PASSWORD', 'SEED_USER_PASSWORD'].filter(
    (key) => !process.env[key]?.trim(),
  );
  return { ready: missing.length === 0, missing };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    printHelpAndExit();
  }
  const skipSeed = args.includes('--skip-seed');
  const allowProduction = args.includes('--allow-production');

  loadDotenv(ENV_PATH);

  if (process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error(
      '[db:reset] NODE_ENV=production，拒绝执行。若确需重置生产库，请显式加 --allow-production。',
    );
    process.exit(1);
  }

  const target = process.env.DATABASE_URL
    ? redactDatabaseUrl(process.env.DATABASE_URL)
    : '(DATABASE_URL 未配置)';
  console.log('⚠️  此操作将清空目标数据库中的全部数据并重新执行全部迁移。');
  console.log(`   目标: ${target}`);
  if (!skipSeed) {
    const { missing } = seedEnvReady();
    if (missing.length > 0) {
      console.log('   seed: 将跳过（未配置 ' + missing.join(' / ') + '，详见 --help）');
    } else {
      console.log('   seed: 重置后将重新写入 admin@dm.local / user@dm.local');
    }
  }
  console.log('');

  const answer = await readConfirmation();
  if (!confirmYes(answer)) {
    console.log('已取消，数据库未做任何改动。');
    process.exit(0);
  }

  console.log('\n[1/2] 执行 prisma migrate reset --force（含 prisma generate）...');
  execSync('pnpm exec prisma migrate reset --force', {
    cwd: API_DIR,
    stdio: 'inherit',
  });

  if (skipSeed) {
    console.log('\n[2/2] 已按 --skip-seed 跳过 seed。');
  } else {
    const { ready, missing } = seedEnvReady();
    if (!ready) {
      console.log('\n[2/2] 跳过 seed：缺少环境变量 ' + missing.join(' / ') + '。');
      console.log('      迁移已重置成功。补齐 seed 的方式：');
      console.log('        1) 在 apps/api/.env 配置（参见 .env.example），或导出环境变量；');
      console.log('        2) 运行 pnpm db:seed（根目录）/ pnpm prisma:seed（apps/api）。');
    } else {
      console.log('\n[2/2] 执行 seed（pnpm run prisma:seed）...');
      execSync('pnpm run prisma:seed', { cwd: API_DIR, stdio: 'inherit' });
    }
  }

  console.log('\n✓ 数据库重置完成。');
}

main().catch((err: unknown) => {
  console.error('[db:reset] 失败:', err instanceof Error ? err.message : err);
  process.exit(1);
});
