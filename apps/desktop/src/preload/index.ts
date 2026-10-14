import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  showItemInFolder: (fullPath: string) => ipcRenderer.send('file:showInFolder', fullPath),
  openFile: (fullPath: string) => ipcRenderer.send('file:open', fullPath),
  updateTrayProgress: (progress: number, taskCount: number) => ipcRenderer.send('tray:updateProgress', { progress, taskCount }),
  showNotification: (title: string, body: string) => ipcRenderer.send('notification:show', { title, body }),
  onSearchShortcut: (callback: () => void) => ipcRenderer.on('shortcut:search', () => callback()),
  isDesktop: true
});
