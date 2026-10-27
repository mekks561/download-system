import { BrowserWindow, shell, app } from 'electron';
import path from 'path';
import serve from 'electron-serve';
import { getWindowState, saveWindowState } from './store.js';
import { logger } from './logger.js';
import { config, isDev } from './config.js';

// 生产环境下，使用 electron-serve 托管静态资源
const serveWeb = serve({ 
  directory: path.join(process.resourcesPath, 'renderer/web'),
  scheme: 'web'
});

const serveAdmin = serve({ 
  directory: path.join(process.resourcesPath, 'renderer/admin'),
  scheme: 'admin'
});

// 加载等待页面（Splash Screen）
async function loadSplashScreen(window: BrowserWindow) {
  const splashPath = isDev 
    ? path.join(app.getAppPath(), 'out/renderer/index.html')
    : path.join(process.resourcesPath, 'renderer/index.html');
  await window.loadFile(splashPath);
}

async function waitForApi(url: string, maxRetries = 10): Promise<boolean> {
  logger.info(`Waiting for API at ${url}...`);
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        logger.info('API is healthy and ready.');
        return true;
      }
    } catch (e) {
      // Ignore error and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

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

export async function createMainWindow() {
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
      preload: isDev 
        ? path.join(app.getAppPath(), 'out/preload/index.mjs')
        : path.join(process.resourcesPath, 'out/preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--api-url=http://localhost:${config.api.port}`]
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
  
  if (!isDev) {
    await loadSplashScreen(mainWindow);
  }

  const apiReady = await waitForApi(`http://localhost:${config.api.port}`);
  if (!apiReady) {
    logger.error('API failed to start in time, loading frontend anyway...');
  }
  
  if (isDev) {
    mainWindow.loadURL(config.web.url);
  } else {
    await serveWeb(mainWindow);
  }

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

export async function createAdminWindow() {
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
      preload: isDev 
        ? path.join(app.getAppPath(), 'out/preload/index.mjs')
        : path.join(process.resourcesPath, 'out/preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--api-url=http://localhost:${config.api.port}`]
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
  
  if (!isDev) {
    await loadSplashScreen(adminWindow);
  }

  const apiReady = await waitForApi(`http://localhost:${config.api.port}`);
  if (!apiReady) {
    logger.error('API failed to start in time for Admin window, loading anyway...');
  }
  
  if (isDev) {
    adminWindow.loadURL(config.admin.url);
  } else {
    await serveAdmin(adminWindow);
  }

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

export async function showMainWindow() {
  if (!mainWindow) {
    await createMainWindow();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

export async function showAdminWindow() {
  if (!adminWindow) {
    await createAdminWindow();
  } else {
    if (adminWindow.isMinimized()) adminWindow.restore();
    adminWindow.show();
    adminWindow.focus();
  }
}
