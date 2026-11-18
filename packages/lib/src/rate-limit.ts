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

/** Minimal header shape — works for PayloadRequest.headers and Headers. */
type HeaderLike = { get?: (name: string) => string | null } | null | undefined

/**
 * Rate-limit key for a request (audit 2026-11-18 C1). The LEFTMOST
 * X-Forwarded-For entry is whatever the client typed, so keying on it let
 * one caller rotate unlimited identities. Order of trust instead:
 * 1. `x-real-ip` — set by the edge proxy, never forwarded from the client;
 * 2. the RIGHTMOST XFF hop — appended by the nearest proxy;
 * 3. 'unknown' (direct local access — one shared bucket).
 * Production must still sit behind a proxy that sets one of these
 * (11-access-security.md).
 */
export const clientIpFromHeaders = (headers: HeaderLike): string => {
  const real = headers?.get?.('x-real-ip')?.trim()
  if (real) return real
  const hops = headers?.get?.('x-forwarded-for')?.split(',').map((h) => h.trim()).filter(Boolean) ?? []
  return hops[hops.length - 1] || 'unknown'
}

/**
 * IP-keyed rate-limit gate shared by the plugin endpoints: returns the 429
 * Response to short-circuit with, or null when the request may proceed.
 */
export const rateLimitedResponse = (
  limiter: RateLimiter,
  headers: HeaderLike,
): Response | null => {
  const result = limiter.check(clientIpFromHeaders(headers))
  if (result.ok) return null
  return Response.json(
    { error: 'rate limit exceeded', retryAfterMs: result.retryAfterMs },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) },
    },
  )
}
