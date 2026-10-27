import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { getMariaDBBinPath, getMariaDBDataPath } from './db-paths.js';

let dbProcess: ChildProcess | null = null;

/**
 * 初始化 MariaDB 数据库目录
 */
export async function initDatabase(): Promise<void> {
  const dataPath = getMariaDBDataPath();
  const binPath = getMariaDBBinPath();

  if (!fs.existsSync(dataPath) || fs.readdirSync(dataPath).length === 0) {
    logger.info('Initializing MariaDB database directory...');
    fs.mkdirSync(dataPath, { recursive: true });

    const isWindows = process.platform === 'win32';
    const initCmd = isWindows ? 'mysql_install_db.exe' : 'mysql_install_db';
    let initPath = path.join(binPath, initCmd);

    // 检查初始化工具是否存在
    if (!fs.existsSync(initPath)) {
      logger.warn(`${initCmd} not found at ${initPath}. Falling back to mariadbd --initialize-insecure.`);
      const daemonCmd = isWindows ? 'mariadbd.exe' : 'mariadbd';
      initPath = path.join(binPath, daemonCmd);
      
      if (!fs.existsSync(initPath)) {
        throw new Error(`MariaDB binaries not found in ${binPath}`);
      }
    }

    return new Promise((resolve, reject) => {
      logger.info(`Running initialization: ${initPath}`);
      
      const args: string[] = [];
      if (initPath.endsWith('mariadbd') || initPath.endsWith('mariadbd.exe')) {
        args.push('--initialize-insecure', `--datadir=${dataPath}`, `--basedir=${binPath}`);
      } else {
        args.push(`--datadir=${dataPath}`, `--basedir=${binPath}`);
      }

      const child = spawn(initPath, args, {
        cwd: binPath,
        windowsHide: true,
      });

      child.stdout?.on('data', (data) => logger.info(`[DB-Init] ${data}`));
      child.stderr?.on('data', (data) => logger.warn(`[DB-Init-Log] ${data}`));

      child.on('close', (code) => {
        if (code === 0) {
          logger.info('MariaDB initialization completed successfully.');
          resolve();
        } else {
          logger.error(`MariaDB initialization failed with code ${code}`);
          reject(new Error(`MariaDB initialization failed with code ${code}`));
        }
      });

      child.on('error', (err) => {
        logger.error(`Failed to start MariaDB initialization: ${err.message}`);
        reject(err);
      });
    });
  } else {
    logger.info('MariaDB data directory already exists, skipping initialization.');
  }
}

/**
 * 启动 MariaDB 进程
 */
export async function startDbProcess(): Promise<void> {
  if (dbProcess) {
    logger.warn('MariaDB process is already running.');
    return;
  }

  try {
    await initDatabase();
  } catch (err) {
    logger.error(`Failed to initialize database: ${err}`);
    throw err;
  }

  const binPath = getMariaDBBinPath();
  const dataPath = getMariaDBDataPath();
  const isWindows = process.platform === 'win32';
  const daemonCmd = isWindows ? 'mariadbd.exe' : 'mariadbd';
  const daemonPath = path.join(binPath, daemonCmd);

  if (!fs.existsSync(daemonPath)) {
    throw new Error(`MariaDB daemon not found at ${daemonPath}`);
  }

  logger.info(`Starting MariaDB from: ${daemonPath}`);

  dbProcess = spawn(daemonPath, [
    `--datadir=${dataPath}`,
    '--port=3307',
    '--skip-networking=0',
    '--bind-address=127.0.0.1',
    // 强制使用独立进程运行，不作为服务
    '--console'
  ], {
    cwd: binPath,
    windowsHide: true,
  });

  dbProcess.stdout?.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) logger.info(`[DB] ${msg}`);
  });

  dbProcess.stderr?.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) logger.warn(`[DB-Log] ${msg}`);
  });

  dbProcess.on('error', (err) => {
    logger.error(`MariaDB process error: ${err.message}`);
  });

  dbProcess.on('exit', (code, signal) => {
    logger.info(`MariaDB process exited with code ${code} and signal ${signal}`);
    dbProcess = null;
  });

  // 等待一段时间确保进程启动成功，或者可以通过尝试连接来验证
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 2000);
  });
}

/**
 * 停止 MariaDB 进程
 */
export function stopDbProcess(): void {
  if (dbProcess) {
    logger.info('Stopping MariaDB process...');
    dbProcess.kill();
    dbProcess = null;
  }
}
