import { describe, it, expect, vi, beforeEach } from 'vitest';
// NOTE: apps/api uses "type":"commonjs" + tsconfig.module=CommonJS.
// Vitest's TS transform resolves .ts extensions automatically, so we
// import without explicit .js suffix (per delegated task rules).
import { MemoryCache, cache } from './cache.service';

describe('MemoryCache', () => {
  let local: MemoryCache<string, string>;

  beforeEach(() => {
    local = new MemoryCache();
  });

  it('returns undefined for missing key', () => {
    expect(local.get('missing')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    local.set('k', 'v', 60_000);
    expect(local.get('k')).toBe('v');
  });

  it('deletes a value via del()', () => {
    local.set('k', 'v', 60_000);
    local.del('k');
    expect(local.get('k')).toBeUndefined();
  });

  it('expires entries after TTL elapses (fake timers)', () => {
    vi.useFakeTimers();
    try {
      local.set('k', 'v', 1000);
      expect(local.get('k')).toBe('v');
      vi.advanceTimersByTime(1001);
      expect(local.get('k')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('has() returns false for missing key', () => {
    expect(local.has('missing')).toBe(false);
  });

  it('has() returns true for unexpired key', () => {
    local.set('k', 'v', 60_000);
    expect(local.has('k')).toBe(true);
  });

  it('has() returns false after expiry (fake timers)', () => {
    vi.useFakeTimers();
    try {
      local.set('k', 'v', 100);
      vi.advanceTimersByTime(101);
      expect(local.has('k')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('exports a singleton "cache" instance of type MemoryCache', () => {
    expect(cache).toBeInstanceOf(MemoryCache);
    cache.set('singleton-k', 'singleton-v', 60_000);
    expect(cache.get('singleton-k')).toBe('singleton-v');
    cache.del('singleton-k');
  });

  it('clear() removes all entries', () => {
    local.set('a', '1', 60_000);
    local.set('b', '2', 60_000);
    local.clear();
    expect(local.has('a')).toBe(false);
    expect(local.has('b')).toBe(false);
  });
});
