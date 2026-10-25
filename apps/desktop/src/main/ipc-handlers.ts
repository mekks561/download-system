import { ipcMain, dialog, shell, Notification, globalShortcut, powerSaveBlocker } from 'electron';
import { getMainWindow } from './windows.js';
import { updateTrayMenu } from './tray.js';
import { logger } from './logger.js';

let blockerId: number | null = null;

export function initIpcHandlers() {
  // 目录选择
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return canceled ? null : filePaths[0];
  });

  // 文件操作
  ipcMain.on('file:showInFolder', (_, fullPath: string) => {
    if (fullPath) shell.showItemInFolder(fullPath);
  });

  ipcMain.on('file:open', (_, fullPath: string) => {
    if (fullPath) shell.openPath(fullPath);
  });

  // 托盘与进度条更新
  ipcMain.on('tray:updateProgress', (_, info: { progress: number; taskCount: number }) => {
    updateTrayMenu(info);
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.setProgressBar(info.progress > 0 ? info.progress : -1);
    }

    // 阻止系统休眠：当有活跃下载任务时启用
    if (info.taskCount > 0) {
      if (blockerId === null) {
        blockerId = powerSaveBlocker.start('prevent-app-suspension');
        logger.info(`[Power] 系统休眠已阻止 (Blocker ID: ${blockerId})`);
      }
    } else {
      if (blockerId !== null) {
        powerSaveBlocker.stop(blockerId);
        logger.info(`[Power] 系统休眠阻止已解除 (Blocker ID: ${blockerId})`);
        blockerId = null;
      }
    }
  });

  // 系统通知
  ipcMain.on('notification:show', (_, { title, body }: { title: string; body: string }) => {
    new Notification({ title, body }).show();
  });

  // 快捷键支持
  globalShortcut.register('Alt+Shift+S', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('shortcut:search');
    }
  });
}
