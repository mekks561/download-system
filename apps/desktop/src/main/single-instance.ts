import { app } from 'electron';
import { showMainWindow, getMainWindow } from './windows.js';
import { logger } from './logger.js';

export function initSingleInstance() {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return false;
  }

  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    // 当运行第二个实例时，激活主窗口
    showMainWindow();
    
    // 处理 Deep Link URL (Windows/Linux)
    const url = commandLine.pop();
    if (url && url.startsWith('dm://')) {
      logger.info(`[DeepLink] 接收到协议请求: ${url}`);
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('deeplink:url', url);
      }
    }
  });

  return true;
}
