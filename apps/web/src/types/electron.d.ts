export interface IDmAPI {
  dialog: {
    openDirectory: () => Promise<string | null>;
  };
  file: {
    showInFolder: (fullPath: string) => void;
    open: (fullPath: string) => void;
  };
  tray: {
    updateProgress: (progress: number, taskCount: number) => void;
  };
  notification: {
    show: (title: string, body: string) => void;
  };
  shortcuts: {
    onSearch: (callback: () => void) => () => void;
  };
  env: {
    isDesktop: boolean;
    version: string;
  };
}

declare global {
  interface Window {
    dm: IDmAPI;
    /** @deprecated Use dm instead */
    electronAPI: any;
  }
}
