import { app, BrowserWindow, session } from 'electron';
import { resolve } from 'path';
import { createMainWindow } from './windows.js';
import { createTray as initTray } from './tray.js';
import { initSingleInstance } from './single-instance.js';
import { initIpcHandlers } from './ipc-handlers.js';
import { createApplicationMenu } from './menu.js';
import { logger } from './logger.js';

// 注册自定义协议
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('dm', process.execPath, [resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('dm');
}

// 初始化单实例锁
if (initSingleInstance()) {
  app.whenReady().then(() => {
    // 设置全局 CSP
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' data: http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-eval' 'unsafe-inline';"]
        }
      });
    });

    logger.info('Application is ready, starting initialization...');
    createMainWindow();
    initTray();
    initIpcHandlers();
    createApplicationMenu();

    app.on('activate', () => {
      logger.info('App activated');
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    logger.info('All windows closed');
    if (process.platform !== 'darwin') {
      // 保持托盘运行
    }
  });
}
