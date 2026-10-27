import path from 'path';
import { app } from 'electron';

export function getMariaDBBinPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    // In dev, assume binaries are in a specific local folder or path
    return path.join(app.getAppPath(), '../../bin', process.platform);
  }
  return path.join(process.resourcesPath, 'mariadb-bin');
}

export function getMariaDBDataPath() {
  return path.join(app.getPath('userData'), 'db-data');
}
