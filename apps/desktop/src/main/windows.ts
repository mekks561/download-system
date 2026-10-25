import { BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getWindowState, saveWindowState } from './store.js';
import { logger } from './logger.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let adminWindow: BrowserWindow | null = null;

function setupWindowRetry(window: BrowserWindow, url: string, name: string) {
  let retryCount = 0;
  const maxRetries = config.shell.maxRetries;

  window.webContents.on('did-fail-load', () => {
    if (retryCount < maxRetries) {
      retryCount++;
      logger.warn(`[${name}] 加载失败，正在尝试第 ${retryCount} 次重试: ${url}`);
      setTimeout(() => {
        if (!window.isDestroyed()) {
          window.loadURL(url);
        }
      }, config.shell.retryInterval);
    } else {
      logger.error(`[${name}] 最终加载失败: ${url}`);
    }
  });

  window.webContents.on('did-finish-load', () => {
    retryCount = 0;
  });
}

export function createMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return mainWindow;
  }

  const state = getWindowState('main');

  mainWindow = new BrowserWindow({
    x: state?.x,
    y: state?.y,
    width: state?.width || 1200,
    height: state?.height || 800,
    minWidth: config.web.minWidth,
    minHeight: config.web.minHeight,
    title: config.web.title,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const saveState = () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    saveWindowState('main', bounds);
  };

  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);

  setupWindowRetry(mainWindow, config.web.url, 'Main');
  mainWindow.loadURL(config.web.url);

  // 处理链接打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function createAdminWindow() {
  if (adminWindow) {
    if (adminWindow.isMinimized()) adminWindow.restore();
    adminWindow.focus();
    return adminWindow;
  }

  const state = getWindowState('admin');

  adminWindow = new BrowserWindow({
    x: state?.x,
    y: state?.y,
    width: state?.width || 1000,
    height: state?.height || 700,
    minWidth: config.admin.minWidth,
    minHeight: config.admin.minHeight,
    title: config.admin.title,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const saveState = () => {
    if (!adminWindow) return;
    const bounds = adminWindow.getBounds();
    saveWindowState('admin', bounds);
  };

  adminWindow.on('resize', saveState);
  adminWindow.on('move', saveState);

  setupWindowRetry(adminWindow, config.admin.url, 'Admin');
  adminWindow.loadURL(config.admin.url);

  adminWindow.on('closed', () => {
    adminWindow = null;
  });

  return adminWindow;
}

export function getMainWindow() {
  return mainWindow;
}

export function getAdminWindow() {
  return adminWindow;
}

export function showMainWindow() {
  if (!mainWindow) {
    createMainWindow();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

export function showAdminWindow() {
  if (!adminWindow) {
    createAdminWindow();
  } else {
    if (adminWindow.isMinimized()) adminWindow.restore();
    adminWindow.show();
    adminWindow.focus();
  }
}
