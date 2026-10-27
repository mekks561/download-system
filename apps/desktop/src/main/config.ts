import { app } from 'electron';

export const isDev = !app.isPackaged;

export const config = {
  web: {
    url: process.env.WEB_URL || (isDev ? 'http://localhost:3000' : 'web://-'),
    title: 'DM Download System',
    minWidth: 1000,
    minHeight: 600,
  },
  admin: {
    url: process.env.ADMIN_URL || (isDev ? 'http://localhost:3100' : 'admin://-'),
    title: 'DM Management Console',
    minWidth: 800,
    minHeight: 600,
  },
  api: {
    port: parseInt(process.env.API_PORT || '5001', 10),
  },
  shell: {
    version: '3.1.0-mvp',
    retryInterval: 2000,
    maxRetries: 5,
  }
};
