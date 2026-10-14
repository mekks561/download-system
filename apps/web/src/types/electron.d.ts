export interface IElectronAPI {
  openDirectory: () => Promise<string | null>;
  showItemInFolder: (fullPath: string) => void;
  openFile: (fullPath: string) => void;
  updateTrayProgress: (progress: number, taskCount: number) => void;
  showNotification: (title: string, body: string) => void;
  onSearchShortcut: (callback: () => void) => void;
  isDesktop: boolean;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
