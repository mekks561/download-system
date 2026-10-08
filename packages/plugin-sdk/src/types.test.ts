import { describe, it, expect } from 'vitest';
import type {
  PluginManifest,
  DownloadAdapter,
  ScriptPlugin,
  UIPlugin,
  PluginLifecycle,
  PluginContext,
  Plugin,
  MenuContribution,
  PageContribution,
  WidgetContribution,
} from './types.js';

// Compile-time check that types are exported
describe('plugin-sdk types', () => {
  it('manifest type is valid', () => {
    const m: PluginManifest = {
      id: 'hello-world',
      name: 'Hello',
      version: '1.0.0',
      author: 'me',
      description: 'demo',
      type: 'ui',
      permissions: [],
      entry: 'index.js',
    };
    expect(m.id).toBe('hello-world');
  });

  it('plugin context has registration methods', () => {
    const ctx: PluginContext<'ui'> = {
      host: {} as any,
      registerMenu: () => {},
      registerPage: () => {},
      registerWidget: () => {},
      manifest: {} as any,
    };
    expect(typeof ctx.registerMenu).toBe('function');
  });
});
