import type * as React from 'react';
import type { Permission } from './permissions.js';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  type: 'download-adapter' | 'script' | 'ui';
  permissions: Permission[];
  entry: string;
}

// Download protocol adapter
export interface DownloadAdapter {
  canHandle(url: URL): boolean;
  createTask(url: URL, opts: DownloadOpts): Promise<DownloadTask>;
  onProgress(taskId: string, cb: (p: Progress) => void): Unsubscribe;
  pause(taskId: string): Promise<void>;
  resume(taskId: string): Promise<void>;
  cancel(taskId: string): Promise<void>;
}

export interface DownloadOpts {
  downloadDir: string;
  maxConcurrent: number;
  speedLimitKBps: number;
  headers?: Record<string, string>;
}

export interface DownloadTask {
  id: string;
  url: string;
  state: 'queued' | 'downloading' | 'paused' | 'completed' | 'cancelled' | 'error';
  bytesDownloaded: number;
  bytesTotal: number;
}

export interface Progress {
  taskId: string;
  bytesDownloaded: number;
  bytesTotal: number;
  speedKBps: number;
}

export type Unsubscribe = () => void;

// Script plugin
export interface DownloadContext {
  taskId: string;
  url: string;
  filename: string;
  userId: number;
}

export interface FileContext {
  fileId: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface ScheduleContext {
  trigger: 'cron' | 'interval' | 'manual';
  timestamp: number;
}

export interface ScriptPlugin {
  hooks?: Partial<{
    onDownloadStart(ctx: DownloadContext): Promise<void> | void;
    onDownloadComplete(ctx: DownloadContext): Promise<void> | void;
    onDownloadError(ctx: DownloadContext, err: Error): Promise<void> | void;
    onFileSaved(ctx: FileContext): Promise<void> | void;
    onSchedule(ctx: ScheduleContext): Promise<void> | void;
  }>;
}

// UI plugin
export interface MenuContribution {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  order?: number;
}

export interface PageContribution {
  id: string;
  path: string;
  label: string;
  component: React.ComponentType;
  order?: number;
}

export interface WidgetContribution {
  id: string;
  label: string;
  component: React.ComponentType;
  location: 'dashboard' | 'sidebar';
  order?: number;
}

export interface UIPlugin {
  readonly contributions?: {
    menus?: MenuContribution[];
    pages?: PageContribution[];
    widgets?: WidgetContribution[];
  };
}

// Plugin lifecycle (all plugins implement)
export interface PluginLifecycle<TCtx = PluginContext> {
  activate(ctx: TCtx): Promise<void> | void;
  deactivate(ctx: TCtx): Promise<void> | void;
}

// PluginContext: passed to activate(ctx)
export interface HostAPI {
  logger: { info(msg: string): void; warn(msg: string): void; error(msg: string): void };
  showNotification(message: string): void;
  emit(event: string, payload?: unknown): void;
  on(event: string, handler: (payload: unknown) => void): Unsubscribe;
  /** 执行远程 Worker 上的重型任务 (分布式自动化) */
  executeRemoteTask(workerId: string, taskType: string, args: unknown): Promise<unknown>;
}

export interface PluginContext<TType extends PluginManifest['type'] = 'ui'> {
  host: HostAPI;
  registerMenu: (m: MenuContribution) => void;
  registerPage: (p: PageContribution) => void;
  registerWidget: (w: WidgetContribution) => void;
  manifest: PluginManifest;
}

// Composite type: what plugin authors export as default
export type Plugin<TType extends PluginManifest['type'] = 'ui'> =
  PluginLifecycle<PluginContext<TType>> &
  (TType extends 'download-adapter' ? DownloadAdapter :
   TType extends 'script' ? ScriptPlugin :
   TType extends 'ui' ? UIPlugin : never);
