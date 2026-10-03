/**
 * In-memory TTL cache for serverless functions.
 * Note: per-instance only (not shared across Lambda instances, resets on cold start) —
 * same tradeoff as lib/middleware/rateLimiter.js. Fine for dashboard-style endpoints
 * where a few seconds of staleness is acceptable but repeated polling shouldn't
 * re-run expensive aggregations every time.
 */

const store = new Map();

export function getCached(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCached(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Call after a write that changes what a cached read would return, so the
// next read repopulates instead of serving stale data until the TTL expires.
export function invalidateCached(key) {
  store.delete(key);
}

/**
 * Returns the cached value for `key`, or computes it via `fn`, caches it for
 * `ttlMs`, and returns it. `fn` is only invoked on a cache miss.
 */
export async function withCache(key, ttlMs, fn) {
  const cached = getCached(key);
  if (cached !== undefined) return cached;
  const value = await fn();
  setCached(key, value, ttlMs);
  return value;
}
