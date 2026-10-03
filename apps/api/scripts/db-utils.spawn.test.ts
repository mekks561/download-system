import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { gzipSync, gunzipSync } from 'node:zlib';
import { EventEmitter } from 'node:events';

/**
 * 流式编排的单测：只 mock child_process.spawn（mysql 客户端不存在时 CI 也能跑），
 * zlib / fs 管道全部走真实实现，从而验证：
 *   - mysqldump stdout → gzip → 文件 全链路字节正确
 *   - .sql.gz → gunzip → mysql stdin 全链路字节正确
 *   - 密码只通过 MYSQL_PWD 环境变量传递，绝不进 argv
 *   - 非零退出 / spawn 失败 / 空 dump / 损坏 gzip 都 reject，不留半截文件
 */
const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: mocks.spawn };
});

// 动态 import 确保走 vi.mock 后的模块；beforeAll 装载（本仓 tsconfig 目标为 CJS，不用 TLA）。
type DbUtils = typeof import('./db-utils');
let utils: DbUtils;
beforeAll(async () => {
  utils = await import('./db-utils');
});

class FakeChild extends EventEmitter {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  killed = false;
  kill(): boolean {
    this.killed = true;
    return true;
  }
}

const URL_WITH_ENCODED_PASS = 'mysql://app:p%40ss%3Aw0rd@db.example.com:3307/download_manager';

let dir: string;
let child: FakeChild;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'db-spawn-'));
  child = new FakeChild();
  mocks.spawn.mockReturnValue(child);
});

afterEach(() => {
  vi.clearAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

describe('dumpToGzip（mysqldump → zlib gzip → 文件）', () => {
  it('完整链路：spawn mysqldump、gzip 落盘、密码走 MYSQL_PWD 不进 argv', async () => {
    const out = join(dir, 'backup.sql.gz');
    const sql = Buffer.from(
      '-- mysqldump output\nCREATE TABLE `t` (`id` int);\nINSERT INTO `t` VALUES (1);\n',
    );

    const pending = utils.dumpToGzip(URL_WITH_ENCODED_PASS, out);
    child.stdout.end(sql); // 模拟 mysqldump 输出结束
    child.emit('close', 0); // 真实场景 close 可能早于文件 flush，实现必须等文件写完
    await pending;

    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    const [bin, argv, opts] = mocks.spawn.mock.calls[0]!;
    expect(bin).toBe('mysqldump');
    expect(argv).toEqual(utils.buildMysqldumpArgs(utils.parseDatabaseUrl(URL_WITH_ENCODED_PASS)));
    expect(argv?.join(' ')).not.toContain('p@ss:w0rd');
    expect((opts as { env: NodeJS.ProcessEnv }).env.MYSQL_PWD).toBe('p@ss:w0rd');

    // 落盘内容必须是合法 gzip，解压后与 mysqldump stdout 逐字节一致
    expect(gunzipSync(readFileSync(out)).equals(sql)).toBe(true);
  });

  it('mysqldump 非零退出时 reject，并删除可能的半截文件', async () => {
    const out = join(dir, 'broken.sql.gz');
    const pending = utils.dumpToGzip(URL_WITH_ENCODED_PASS, out);
    child.stdout.write(Buffer.from('partial'));
    child.emit('close', 1);
    await expect(pending).rejects.toThrow(/mysqldump/);
    expect(existsSync(out)).toBe(false);
  });

  it('spawn 本身失败（如 ENOENT）时 reject 出清晰错误', async () => {
    const out = join(dir, 'x.sql.gz');
    const pending = utils.dumpToGzip(URL_WITH_ENCODED_PASS, out);
    child.emit('error', new Error('spawn ENOENT'));
    await expect(pending).rejects.toThrow(/mysqldump/);
  });

  it('dump 内容为空时拒绝写备份文件（防止备份出 0 字节假象）', async () => {
    const out = join(dir, 'empty.sql.gz');
    const pending = utils.dumpToGzip(URL_WITH_ENCODED_PASS, out);
    child.stdout.end();
    child.emit('close', 0);
    await expect(pending).rejects.toThrow(/空/);
    expect(existsSync(out)).toBe(false);
  });
});

describe('restoreFromGzip（文件 → gunzip → mysql stdin）', () => {
  it('完整链路：解压后逐字节喂给 mysql，密码走 MYSQL_PWD 不进 argv', async () => {
    const sql = Buffer.from('CREATE TABLE `t` (`id` int);\nINSERT INTO `t` VALUES (1);\n');
    const file = join(dir, 'backup.sql.gz');
    writeFileSync(file, gzipSync(sql));

    const chunks: Buffer[] = [];
    child.stdin.on('data', (c: Buffer) => chunks.push(c));
    // 真实场景：mysql 消费完 stdin 后退出。mock 里用可写侧 'finish' 触发
    //（可读侧 'end' 需要有人 drain；真实 OS 管道天然在 drain，故以 finish 建模）。
    child.stdin.on('finish', () => setImmediate(() => child.emit('close', 0)));

    await utils.restoreFromGzip(URL_WITH_ENCODED_PASS, file);

    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    const [bin, argv, opts] = mocks.spawn.mock.calls[0]!;
    expect(bin).toBe('mysql');
    expect(argv).toEqual(utils.buildMysqlArgs(utils.parseDatabaseUrl(URL_WITH_ENCODED_PASS)));
    expect(argv?.join(' ')).not.toContain('p@ss:w0rd');
    expect((opts as { env: NodeJS.ProcessEnv }).env.MYSQL_PWD).toBe('p@ss:w0rd');
    expect(Buffer.concat(chunks).equals(sql)).toBe(true);
  });

  it('mysql 非零退出时 reject', async () => {
    const file = join(dir, 'backup.sql.gz');
    writeFileSync(file, gzipSync(Buffer.from('SELECT 1;')));
    child.stdin.on('finish', () => setImmediate(() => child.emit('close', 2)));
    await expect(utils.restoreFromGzip(URL_WITH_ENCODED_PASS, file)).rejects.toThrow(/mysql/);
  });

  it('gzip 内容损坏时 reject 出可读错误，并终止 mysql 子进程', async () => {
    const file = join(dir, 'corrupt.sql.gz');
    writeFileSync(file, Buffer.from('this is definitely not gzip'));
    await expect(utils.restoreFromGzip(URL_WITH_ENCODED_PASS, file)).rejects.toThrow(/gzip|解压/);
    expect(child.killed).toBe(true);
  });

  it('备份文件不存在时 reject（ENOENT）', async () => {
    await expect(
      utils.restoreFromGzip(URL_WITH_ENCODED_PASS, join(dir, 'missing.sql.gz')),
    ).rejects.toThrow();
  });
});
