import { describe, it, expect } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit (sliding window)', () => {
  it('allows up to max hits inside the window', () => {
    const rl = rateLimit({ windowMs: 1000, max: 3 })
    expect(rl.check('ip', 0).ok).toBe(true)
    expect(rl.check('ip', 100).ok).toBe(true)
    const third = rl.check('ip', 200)
    expect(third.ok).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it('blocks the hit after max and reports retryAfterMs', () => {
    const rl = rateLimit({ windowMs: 1000, max: 2 })
    rl.check('ip', 0)
    rl.check('ip', 100)
    const blocked = rl.check('ip', 200)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(1000)
  })

  it('slides: old hits expire from the window', () => {
    const rl = rateLimit({ windowMs: 1000, max: 2 })
    rl.check('ip', 0)
    rl.check('ip', 100)
    expect(rl.check('ip', 500).ok).toBe(false)
    expect(rl.check('ip', 1001).ok).toBe(true) // first hit (t=0) has expired
  })

  it('tracks keys independently', () => {
    const rl = rateLimit({ windowMs: 1000, max: 1 })
    expect(rl.check('a', 0).ok).toBe(true)
    expect(rl.check('b', 0).ok).toBe(true)
    expect(rl.check('a', 10).ok).toBe(false)
    expect(rl.check('b', 10).ok).toBe(false)
  })

  it('sweeps stale keys once the window has elapsed (bounded memory)', () => {
    const rl = rateLimit({ windowMs: 1000, max: 2 })
    rl.check('a', 0)
    rl.check('b', 100)
    expect(rl.stats().keys).toBe(2)
    // t=2500 > windowMs since the last sweep → 'a' (t=0) and 'b' (t=100) are stale
    expect(rl.check('c', 2500).ok).toBe(true)
    expect(rl.stats().keys).toBe(1)
    // a fresh key in a new window is not blocked by old hits
    expect(rl.check('a', 2510).ok).toBe(true)
  })

  it('hard-caps tracked keys at maxKeys (spoofed-IP growth cannot grow the map)', () => {
    const rl = rateLimit({ windowMs: 60_000, max: 2, maxKeys: 3 })
    rl.check('k0', 0)
    rl.check('k1', 0)
    rl.check('k2', 0)
    expect(rl.stats().keys).toBe(3)
    rl.check('k3', 1) // no sweep possible by time → evict oldest-inserted
    expect(rl.stats().keys).toBe(3)
    rl.check('k4', 2)
    expect(rl.stats().keys).toBe(3)
    // existing keys inside the window still enforce their limits
    expect(rl.check('k1', 3).ok).toBe(true)
    expect(rl.check('k1', 4).ok).toBe(true)
    expect(rl.check('k1', 5).ok).toBe(false)
  })
})
