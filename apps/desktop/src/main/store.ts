import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const storePath = path.join(app.getPath('userData'), 'window-state.json');

export function saveWindowState(key: string, state: any) {
  try {
    let current = {};
    if (fs.existsSync(storePath)) {
      current = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    }
    const updated = { ...current, [key]: state };
    fs.writeFileSync(storePath, JSON.stringify(updated, null, 2));
  } catch {
    console.error('[Store] Failed to save window state');
  }
}

export function getWindowState(key: string) {
  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return data[key];
    }
  } catch {
    console.error('[Store] Failed to get window state');
  }
  return null;
}
