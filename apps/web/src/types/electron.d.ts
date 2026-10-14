export interface IElectronAPI {
  openDirectory: () => Promise<string | null>;
  isDesktop: boolean;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
