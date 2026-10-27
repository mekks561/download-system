import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { logger } from './logger.js';

export function initUpdater() {
  autoUpdater.logger = logger;
  
  autoUpdater.on('update-available', () => {
    logger.info('Update available.');
  });
  
  autoUpdater.on('update-downloaded', () => {
    logger.info('Update downloaded; will install now');
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdatesAndNotify();
}
