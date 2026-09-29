/**
 * In-memory sliding-window rate limiter (zero deps).
 * Single-instance only — swap for Upstash Ratelimit in multi-instance prod (12-integrations-ops.md).
 * The key table is bounded: stale keys are swept every windowMs, and a hard
 * maxKeys cap evicts oldest-inserted keys so spoofed IPs cannot grow memory.
 */

export interface RateLimitResult {
  ok: boolean
  retryAfterMs: number
  remaining: number
}

export interface RateLimiter {
  check: (key: string, now?: number) => RateLimitResult
  stats: () => { keys: number }
}

export const rateLimit = (options: { windowMs: number; max: number; maxKeys?: number }): RateLimiter => {
  const hits = new Map<string, number[]>()
  const maxKeys = options.maxKeys ?? 10_000
  let lastSweep = 0

  const sweep = (now: number): void => {
    lastSweep = now
    const windowStart = now - options.windowMs
    for (const [key, timestamps] of hits) {
      const recent = timestamps.filter((t) => t > windowStart)
      if (recent.length === 0) hits.delete(key)
      else hits.set(key, recent)
    }
  }

  return {
    check(key, now = Date.now()) {
      if (now - lastSweep >= options.windowMs) sweep(now)
      const windowStart = now - options.windowMs
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)
      if (recent.length === 0) hits.delete(key)
      if (recent.length >= options.max) {
        hits.set(key, recent)
        return { ok: false, retryAfterMs: recent[0] + options.windowMs - now, remaining: 0 }
      }
      recent.push(now)
      if (!hits.has(key) && hits.size >= maxKeys) {
        // Hard cap: Map preserves insertion order, so drop the oldest-inserted key.
        const oldest = hits.keys().next().value
        if (oldest !== undefined) hits.delete(oldest)
      }
      hits.set(key, recent)
      return { ok: true, retryAfterMs: 0, remaining: options.max - recent.length }
    },
    stats: () => ({ keys: hits.size }),
  }
}
