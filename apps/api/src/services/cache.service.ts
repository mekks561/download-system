/**
 * In-process memory cache with TTL support.
 *
 * Replaces the planned Redis-backed CacheService from v3.0.0 (YAGNI: Redis was
 * never wired into app.ts and never enabled in production). The public API
 * matches the design spec §4.3 MemoryCache signature — call sites added later
 * do not need any changes.
 *
 * Public API (stable — do not break signatures in follow-up tasks):
 *   new MemoryCache<K, V>()                        // constructor
 *   get(k: K): V | undefined                       // read; returns undefined if missing/expired
 *   set(k: K, v: V, ttlMs: number): void           // write with TTL in ms
 *   has(k: K): boolean                             // presence check (respects TTL)
 *   del(k: K): void                                // delete entry
 *   clear(): void                                  // remove all entries
 *
 * Default export `cache` is a singleton pre-typed as <string, unknown>,
 * suitable for drop-in shared usage (matches the S2 plan's default export).
 */
export class MemoryCache<K = string, V = unknown> {
  private readonly store = new Map<K, { v: V; exp: number }>();

  /**
   * Read a cached value.
   * @returns value if present and not expired; otherwise undefined.
   */
  get(k: K): V | undefined {
    const entry = this.store.get(k);
    if (!entry) return undefined;
    if (entry.exp < Date.now()) {
      this.store.delete(k);
      return undefined;
    }
    return entry.v;
  }

  /**
   * Store a value with a TTL.
   * @param k cache key
   * @param v cache value
   * @param ttlMs time-to-live in milliseconds (non-negative).
   *        Pass 0 to store without expiry (effectively infinite).
   */
  set(k: K, v: V, ttlMs: number): void {
    const exp = ttlMs <= 0 ? Number.POSITIVE_INFINITY : Date.now() + ttlMs;
    this.store.set(k, { v, exp });
  }

  /**
   * Presence check that respects TTL.
   * Expired entries are lazily removed when has() is called, matching get() semantics.
   */
  has(k: K): boolean {
    const entry = this.store.get(k);
    if (!entry) return false;
    if (entry.exp < Date.now()) {
      this.store.delete(k);
      return false;
    }
    return true;
  }

  /** Delete a cache entry. No-op if key does not exist. */
  del(k: K): void {
    this.store.delete(k);
  }

  /** Remove all entries from this cache instance. */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Backward-compatible singleton export.
 * Usage in downstream modules:
 *   import { cache } from './services/cache.service';
 *   cache.set('user:1', user, 5 * 60_000);
 */
export const cache = new MemoryCache<string, unknown>();
