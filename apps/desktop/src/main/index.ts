import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog } from 'electron';
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
  // Using a simple emoji or placeholder if icon not found
  const icon = nativeImage.createEmpty(); 
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Main System', click: () => {
      if (!mainWindow) createMainWindow();
      else mainWindow.show();
    }},
    { label: 'Show Management Console', click: () => {
      createAdminWindow();
    }},
    { type: 'separator' },
    { label: 'Exit', click: () => {
      app.quit();
    }}
  ]);

  tray.setToolTip('DM Download Manager');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();

  // IPC Handlers
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
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
