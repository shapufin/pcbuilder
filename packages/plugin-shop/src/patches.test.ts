import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Patch regression pins (#233) — the plugin-ecommerce patch carries two
 * behaviours the app depends on and that silently vanish on an upgrade
 * (pnpm drops a patch whose target no longer matches). Read the patch text
 * so a lost hunk fails a test instead of a live payment.
 */
const patch = readFileSync(
  new URL('../../../patches/@payloadcms__plugin-ecommerce@3.90.2.patch', import.meta.url),
  'utf8',
)

describe('plugin-ecommerce patch pins', () => {
  it('#233 initiatePayment charges the server-computed cart.total', () => {
    expect(patch).toMatch(/const amount = typeof cart\.total === 'number' \? cart\.total : cart\.subtotal/)
    // A `cart.total > 0` guard would fall back to subtotal on a legitimately
    // free cart and overcharge it — the fallback must be type-based only.
    expect(patch).not.toMatch(/cart\.total > 0/)
  })

  it('#234 upstream decrementInventory skips composite lines (no post-order crash)', () => {
    expect(patch).toMatch(/item\.lineType !== 'standard'/)
    expect(patch).toMatch(/continue;/)
  })

  it('#235 merge endpoint receives the composite cart matcher', () => {
    expect(patch).toMatch(/mergeCartEndpoint\(\{\n\s*\+?\s*cartItemMatcher,/)
  })
})
