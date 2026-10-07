import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

import { persistCartHandle, resolveCartHandle } from './cart-ensure'

/**
 * Fresh-guest cart bridge (entry 67). When the provider has no cart yet,
 * addToCart mints one via POST /api/carts — but before this fix it saved
 * only `cart_secret`, never `cart`, so the provider's localStorage restore
 * could never find it again and `refreshCart()` (a no-op without cartID)
 * left the drawer showing an empty cart. The build landed in an orphaned
 * cart on every deploy.
 */

const memoryStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    map,
  }
}

describe('resolveCartHandle', () => {
  it('#429 prefers the provider cartID over every fallback', () => {
    const s = memoryStorage()
    s.setItem('cart', 'ls-cart')
    const h = resolveCartHandle('ctx-cart', { id: 'loaded-cart' }, s)
    expect(h.cartId).toBe('ctx-cart')
  })

  it('#430 falls back to the loaded cart, then the synced storage key', () => {
    const s = memoryStorage()
    s.setItem('cart', 'ls-cart')
    expect(resolveCartHandle(undefined, { id: 'loaded-cart' }, s).cartId).toBe('loaded-cart')
    expect(resolveCartHandle(undefined, undefined, s).cartId).toBe('ls-cart')
    expect(resolveCartHandle(undefined, undefined, memoryStorage()).cartId).toBeUndefined()
  })

  it('#431 returns the stored secret alongside the id', () => {
    const s = memoryStorage()
    s.setItem('cart_secret', 's3cr3t')
    expect(resolveCartHandle(undefined, undefined, s).secret).toBe('s3cr3t')
  })
})

describe('persistCartHandle', () => {
  it('#432 writes BOTH keys the provider restore reads', () => {
    const s = memoryStorage()
    persistCartHandle({ cartId: 183, secret: 'abc' }, s)
    expect(s.map.get('cart')).toBe('183')
    expect(s.map.get('cart_secret')).toBe('abc')
  })

  it('#433 keeps a missing secret absent rather than writing "undefined"', () => {
    const s = memoryStorage()
    persistCartHandle({ cartId: 'c9' }, s)
    expect(s.map.get('cart')).toBe('c9')
    expect(s.map.has('cart_secret')).toBe(false)
  })
})

describe('useBuildActions wiring', () => {
  const src = fs.readFileSync(path.join(__dirname, 'useBuildActions.ts'), 'utf8')

  it('#434 minted guest carts are persisted under the provider sync keys', () => {
    expect(src).toContain('persistCartHandle')
    expect(src).not.toContain("localStorage.setItem('cart_secret', secret)")
  })

  it('#435 minted carts are adopted into provider state, not just refreshCart', () => {
    expect(src).toContain('adoptCart')
  })
})
