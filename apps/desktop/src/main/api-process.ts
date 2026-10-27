import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import { logger } from './logger.js';
import { config } from './config.js';

let apiProcess: ChildProcess | null = null;

export async function startApiProcess() {
  if (apiProcess) return;

  const isDev = !app.isPackaged;
  const apiRoot = isDev 
    ? path.join(app.getAppPath(), '../../apps/api')
    : path.join(process.resourcesPath, 'api-dist');
  
  logger.info(`Starting API process at ${apiRoot} (isDev: ${isDev})`);

  const cmd = isDev ? (process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm') : 'node';
  const args = isDev ? ['--filter', 'api', 'dev'] : [path.join(apiRoot, 'src/server.js')];

  apiProcess = spawn(cmd, args, {
    cwd: isDev ? path.join(app.getAppPath(), '../..') : apiRoot,
    env: { 
      ...process.env, 
      PORT: config.api.port.toString(),
      DATABASE_URL: process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3307/download_manager'
    },
    shell: true
  });

  apiProcess.stdout?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      logger.info(`[API] ${output}`);
    }
  });

  apiProcess.stderr?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      logger.error(`[API-Err] ${output}`);
    }
  });

  apiProcess.on('close', (code) => {
    logger.warn(`API process exited with code ${code}`);
    apiProcess = null;
  });

  apiProcess.on('error', (err) => {
    logger.error(`Failed to start API process: ${err.message}`);
  });
}

export function stopApiProcess() {
  if (apiProcess) {
    logger.info('Stopping API process...');
    apiProcess.kill();
    apiProcess = null;
  }
}
