export type Permission =
  | { type: 'network'; hosts: string[] }
  | { type: 'fs'; paths: string[]; mode: 'r' | 'w' | 'rw' }
  | { type: 'env'; keys: string[] }
  | { type: 'spawn'; commands: string[] }
  | { type: 'ui'; inject: ('menu' | 'page' | 'widget')[] }
  | { type: 'api'; endpoints: string[] };

export function hasNetworkPermission(perms: Permission[], host: string): boolean {
  const netPerms = perms.filter((p): p is Extract<Permission, { type: 'network' }> => p.type === 'network');
  return netPerms.some((p) => p.hosts.includes('*') || p.hosts.includes(host));
}

export function hasFsPermission(perms: Permission[], path: string, mode: 'r' | 'w'): boolean {
  const fsPerms = perms.filter((p): p is Extract<Permission, { type: 'fs' }> => p.type === 'fs');
  return fsPerms.some((p) => {
    const pathAllowed = p.paths.some((allowed) => path.startsWith(allowed));
    if (!pathAllowed) return false;
    if (mode === 'r') return p.mode === 'r' || p.mode === 'rw';
    if (mode === 'w') return p.mode === 'w' || p.mode === 'rw';
    return false;
  });
}

export function hasUiPermission(perms: Permission[], scope: 'menu' | 'page' | 'widget'): boolean {
  const uiPerms = perms.filter((p): p is Extract<Permission, { type: 'ui' }> => p.type === 'ui');
  return uiPerms.some((p) => p.inject.includes(scope));
}

export function hasSpawnPermission(perms: Permission[], command: string): boolean {
  const spawnPerms = perms.filter((p): p is Extract<Permission, { type: 'spawn' }> => p.type === 'spawn');
  return spawnPerms.some((p) => p.commands.includes(command));
}

export function isPermissionGranted(granted: Permission[], requested: Permission): boolean {
  return granted.some((p) => JSON.stringify(p) === JSON.stringify(requested));
}
