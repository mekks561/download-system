import { app, Menu, Tray, nativeImage } from 'electron';
import { showMainWindow, showAdminWindow } from './windows.js';
import { logger } from './logger.js';
import path from 'path';

let tray: Tray | null = null;

function getIconPath() {
  // 生产环境下图标会被打包到 resources 目录
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  
  // 开发环境下从源码目录查找，生产环境下从 process.resourcesPath 或相对路径查找
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, iconName)
    : path.join(app.getAppPath(), 'resources', iconName);
    
  return iconPath;
}

export function createTray() {
  const iconPath = getIconPath();
  let icon = nativeImage.createEmpty();
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      logger.warn(`[Tray] 图标加载为空，使用占位符: ${iconPath}`);
      icon = nativeImage.createEmpty();
    }
  } catch {
    logger.error(`[Tray] 加载图标失败: ${iconPath}`);
  }

  tray = new Tray(icon);
  updateTrayMenu();
  return tray;
}

export function updateTrayMenu(progressInfo?: { progress: number; taskCount: number }) {
  if (!tray) return;

  const progressText = progressInfo && progressInfo.taskCount > 0 
    ? `下载中: ${progressInfo.taskCount} 个任务 (${Math.round(progressInfo.progress * 100)}%)`
    : '准备就绪';

  const contextMenu = Menu.buildFromTemplate([
    { label: `DM Manager - ${progressText}`, enabled: false },
    { type: 'separator' },
    { label: '显示主界面', click: () => {
      showMainWindow();
    }},
    { label: '管理后台', click: () => {
      showAdminWindow();
    }},
    { type: 'separator' },
    { label: '退出', click: () => {
      app.quit();
    }}
  ]);

  tray.setToolTip(`DM Download Manager\n${progressText}`);
  tray.setContextMenu(contextMenu);
}
