import { describe, it, expect } from 'vitest';
import {
  isPermissionGranted,
  hasNetworkPermission,
  hasFsPermission,
  hasSpawnPermission,
  hasUiPermission,
  type Permission,
} from './permissions.js';

describe('permission model', () => {
  it('grants network access for whitelisted host', () => {
    const perms: Permission[] = [{ type: 'network', hosts: ['api.github.com'] }];
    expect(hasNetworkPermission(perms, 'api.github.com')).toBe(true);
    expect(hasNetworkPermission(perms, 'evil.com')).toBe(false);
  });

  it('grants fs access for whitelisted path with r mode', () => {
    const perms: Permission[] = [{ type: 'fs', paths: ['/tmp/downloads'], mode: 'rw' }];
    expect(hasFsPermission(perms, '/tmp/downloads/file.txt', 'r')).toBe(true);
    expect(hasFsPermission(perms, '/tmp/downloads/file.txt', 'w')).toBe(true);
    expect(hasFsPermission(perms, '/etc/passwd', 'r')).toBe(false);
  });

  it('rejects read-only path for write', () => {
    const perms: Permission[] = [{ type: 'fs', paths: ['/tmp/ro'], mode: 'r' }];
    expect(hasFsPermission(perms, '/tmp/ro/x', 'w')).toBe(false);
  });

  it('grants ui injection by scope', () => {
    const perms: Permission[] = [{ type: 'ui', inject: ['menu', 'widget'] }];
    expect(hasUiPermission(perms, 'menu')).toBe(true);
    expect(hasUiPermission(perms, 'page')).toBe(false);
  });

  it('grants spawn for whitelisted command', () => {
    const perms: Permission[] = [{ type: 'spawn', commands: ['ytdlp', 'ffmpeg'] }];
    expect(hasSpawnPermission(perms, 'ytdlp')).toBe(true);
    expect(hasSpawnPermission(perms, 'rm')).toBe(false);
  });

  it('isPermissionGranted returns true for any granted permission', () => {
    const perms: Permission[] = [{ type: 'network', hosts: ['*'] }];
    expect(isPermissionGranted(perms, perms[0])).toBe(true);
  });
});
