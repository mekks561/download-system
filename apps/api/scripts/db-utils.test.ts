import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  confirmYes,
  parseDatabaseUrl,
  loadDotenv,
  redactDatabaseUrl,
} from './db-utils.js';

describe('confirmYes', () => {
  it('接受各种大小写 / 带空白的 yes', () => {
    expect(confirmYes('yes')).toBe(true);
    expect(confirmYes('YES')).toBe(true);
    expect(confirmYes('Yes')).toBe(true);
    expect(confirmYes('  yes  ')).toBe(true);
    expect(confirmYes('\tyes\r\n')).toBe(true);
  });

  it('拒绝近似词（y / yeah / true 不算显式确认）', () => {
    expect(confirmYes('y')).toBe(false);
    expect(confirmYes('yeah')).toBe(false);
    expect(confirmYes('true')).toBe(false);
  });

  it('拒绝 no 与其它任意输入', () => {
    expect(confirmYes('no')).toBe(false);
    expect(confirmYes('n')).toBe(false);
    expect(confirmYes('delete everything')).toBe(false);
  });

  it('拒绝空串 / null / undefined（覆盖非交互 EOF 场景）', () => {
    expect(confirmYes('')).toBe(false);
    expect(confirmYes('   ')).toBe(false);
    expect(confirmYes(null)).toBe(false);
    expect(confirmYes(undefined)).toBe(false);
  });
});

describe('parseDatabaseUrl', () => {
  it('解析标准 mysql://user:pass@host:port/db', () => {
    expect(parseDatabaseUrl('mysql://root:secret@localhost:3306/download_manager')).toEqual({
      user: 'root',
      pass: 'secret',
      host: 'localhost',
      port: 3306,
      db: 'download_manager',
    });
  });

  it('缺省端口时回落 3306', () => {
    expect(parseDatabaseUrl('mysql://root:secret@localhost/download_manager').port).toBe(3306);
  });

  it('允许空密码（mysql://root@host:port/db）', () => {
    const parsed = parseDatabaseUrl('mysql://root@localhost:3306/download_manager');
    expect(parsed.pass).toBe('');
    expect(parsed.user).toBe('root');
  });

  it('密码中的 URL 编码字符被解码（@ : / 等）', () => {
    const parsed = parseDatabaseUrl(
      'mysql://app:p%40ss%3Aw0rd@db.example.com:3307/download_manager',
    );
    expect(parsed.pass).toBe('p@ss:w0rd');
    expect(parsed.host).toBe('db.example.com');
    expect(parsed.port).toBe(3307);
  });

  it('剥离 query string 与末尾斜杠', () => {
    expect(
      parseDatabaseUrl(
        'mysql://root:secret@localhost:3306/download_manager?connection_limit=5',
      ).db,
    ).toBe('download_manager');
    expect(parseDatabaseUrl('mysql://root:secret@localhost:3306/download_manager/').db).toBe(
      'download_manager',
    );
  });

  it('非 mysql 协议抛错', () => {
    expect(() => parseDatabaseUrl('postgresql://root:secret@localhost:5432/db')).toThrow(
      /mysql/,
    );
  });

  it('缺库名抛错', () => {
    expect(() => parseDatabaseUrl('mysql://root:secret@localhost:3306')).toThrow(/database/i);
  });

  it('非法 URL 抛错（不泄漏密码）', () => {
    expect(() => parseDatabaseUrl('not a url')).toThrow(/DATABASE_URL/);
  });
});

describe('redactDatabaseUrl', () => {
  it('隐藏密码，保留其余定位信息（日志安全）', () => {
    expect(redactDatabaseUrl('mysql://root:topsecret@localhost:3306/download_manager')).toBe(
      'mysql://root:***@localhost:3306/download_manager',
    );
  });

  it('无密码时正常输出', () => {
    expect(redactDatabaseUrl('mysql://root@localhost:3306/download_manager')).toBe(
      'mysql://root@localhost:3306/download_manager',
    );
  });
});

describe('loadDotenv', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'db-utils-'));
    delete process.env.DOTENV_TEST_A;
    delete process.env.DOTENV_TEST_B;
    delete process.env.DOTENV_TEST_C;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.DOTENV_TEST_A;
    delete process.env.DOTENV_TEST_B;
    delete process.env.DOTENV_TEST_C;
  });

  it('解析 KEY=VALUE、去引号、忽略注释与空行', () => {
    writeFileSync(
      join(dir, '.env'),
      [
        '# comment line',
        'DOTENV_TEST_A=hello',
        'DOTENV_TEST_B="quoted value"',
        "DOTENV_TEST_C='single'",
        '',
        '  # indented comment',
      ].join('\n'),
    );

    loadDotenv(join(dir, '.env'));

    expect(process.env.DOTENV_TEST_A).toBe('hello');
    expect(process.env.DOTENV_TEST_B).toBe('quoted value');
    expect(process.env.DOTENV_TEST_C).toBe('single');
  });

  it('不覆盖已存在的环境变量（真实进程环境优先于 .env）', () => {
    process.env.DOTENV_TEST_A = 'from-process';
    writeFileSync(join(dir, '.env'), 'DOTENV_TEST_A=from-file');

    loadDotenv(join(dir, '.env'));

    expect(process.env.DOTENV_TEST_A).toBe('from-process');
  });

  it('文件不存在时静默跳过', () => {
    expect(() => loadDotenv(join(dir, 'missing.env'))).not.toThrow();
  });
});
