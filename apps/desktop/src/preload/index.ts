import { contextBridge, ipcRenderer } from 'electron';

// 严格白名单暴露 IPC 接口
contextBridge.exposeInMainWorld('dm', {
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  },
  file: {
    showInFolder: (fullPath: string) => {
      if (typeof fullPath === 'string') ipcRenderer.send('file:showInFolder', fullPath);
    },
    open: (fullPath: string) => {
      if (typeof fullPath === 'string') ipcRenderer.send('file:open', fullPath);
    },
  },
  tray: {
    updateProgress: (progress: number, taskCount: number) => {
      if (typeof progress === 'number' && typeof taskCount === 'number') {
        ipcRenderer.send('tray:updateProgress', { progress, taskCount });
      }
    },
  },
  notification: {
    show: (title: string, body: string) => {
      if (typeof title === 'string' && typeof body === 'string') {
        ipcRenderer.send('notification:show', { title, body });
      }
    },
  },
  shortcuts: {
    onSearch: (callback: () => void) => {
      if (typeof callback === 'function') {
        const subscription = () => callback();
        ipcRenderer.on('shortcut:search', subscription);
        return () => ipcRenderer.removeListener('shortcut:search', subscription);
      }
      return () => {};
    },
  },
  env: {
    isDesktop: true,
    version: '3.1.0-mvp'
  }
});
