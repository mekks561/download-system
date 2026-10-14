import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog, shell, globalShortcut, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let adminWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3100';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'DM Download System',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(WEB_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createAdminWindow() {
  if (adminWindow) {
    adminWindow.focus();
    return;
  }

  adminWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'DM Management Console',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  adminWindow.loadURL(ADMIN_URL);

  adminWindow.on('closed', () => {
    adminWindow = null;
  });
}

function createTray() {
  // 工业化托盘：支持动态进度条
  const icon = nativeImage.createEmpty(); 
  tray = new Tray(icon);
  updateTrayMenu();
}

function updateTrayMenu(progressInfo?: { progress: number; taskCount: number }) {
  const progressText = progressInfo && progressInfo.taskCount > 0 
    ? `下载中: ${progressInfo.taskCount} 个任务 (${Math.round(progressInfo.progress * 100)}%)`
    : '准备就绪';

  const contextMenu = Menu.buildFromTemplate([
    { label: `DM Manager - ${progressText}`, enabled: false },
    { type: 'separator' },
    { label: '显示主界面', click: () => {
      if (!mainWindow) createMainWindow();
      else mainWindow.show();
    }},
    { label: '管理后台', click: () => {
      createAdminWindow();
    }},
    { type: 'separator' },
    { label: '退出', click: () => {
      app.quit();
    }}
  ]);

  tray?.setToolTip(`DM Download Manager\n${progressText}`);
  tray?.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();

  // 注册全局快捷键：Alt+Shift+S 呼起 AI 语义搜索
  globalShortcut.register('Alt+Shift+S', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('shortcut:search');
    }
  });

  // IPC Handlers
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.on('file:showInFolder', (_, fullPath: string) => {
    shell.showItemInFolder(fullPath);
  });

  ipcMain.on('file:open', (_, fullPath: string) => {
    shell.openPath(fullPath);
  });

  ipcMain.on('tray:updateProgress', (_, info: { progress: number; taskCount: number }) => {
    updateTrayMenu(info);
    if (mainWindow) {
      mainWindow.setProgressBar(info.progress > 0 ? info.progress : -1);
    }
  });

  ipcMain.on('notification:show', (_, { title, body }: { title: string; body: string }) => {
    new Notification({ title, body }).show();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
});
