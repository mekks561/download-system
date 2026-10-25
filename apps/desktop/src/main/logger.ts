import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'main.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function formatMessage(level: string, message: any) {
  const timestamp = new Date().toISOString();
  const content = typeof message === 'object' ? JSON.stringify(message) : message;
  return `[${timestamp}] [${level}] ${content}\n`;
}

function writeLog(level: string, message: any) {
  const formatted = formatMessage(level, message);
  process.stdout.write(formatted);
  try {
    fs.appendFileSync(logFile, formatted);
  } catch {
    // Fallback to console only if file write fails
  }
}

export const logger = {
  info: (msg: any) => writeLog('INFO', msg),
  warn: (msg: any) => writeLog('WARN', msg),
  error: (msg: any) => writeLog('ERROR', msg),
  debug: (msg: any) => {
    if (!app.isPackaged) {
      writeLog('DEBUG', msg);
    }
  }
};
