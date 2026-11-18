import { describe, expect, it } from 'vitest'
import type { CollectionConfig, Config } from 'payload'
import { shopPlugin } from './index.ts'

/**
 * Query Presets (plan task 2.1) — Payload's saved filters/columns/sort views.
 * They replace the bespoke filter pills on the three busiest lists, so the
 * flags must be on the collections that actually ship.
 */
const build = async (): Promise<Config> => {
  const base = {
    collections: [
      {
        slug: 'users',
        auth: true,
        fields: [{ name: 'email', type: 'email' }],
        access: {},
      } as unknown as CollectionConfig,
    ],
    globals: [],
  } as unknown as Config
  return (await shopPlugin()(base)) as Config
}

describe('query presets on shop collections', () => {
  it('#684 products ship query presets', async () => {
    const config = await build()
    const products = config.collections?.find((c) => c.slug === 'products') as CollectionConfig | undefined
    expect(products, 'products collection missing from the built config').toBeDefined()
    expect(products?.enableQueryPresets).toBe(true)
  })

  it('#685 orders ship query presets', async () => {
    const config = await build()
    const orders = config.collections?.find((c) => c.slug === 'orders') as CollectionConfig | undefined
    expect(orders, 'orders collection missing from the built config').toBeDefined()
    expect(orders?.enableQueryPresets).toBe(true)
  })
})

describe('audit 2026-11-18 M2 — no anonymous discount-code oracle', () => {
  it('#739 the plugin registers no root /discounts/validate endpoint', async () => {
    const config = await build()
    const paths = (config.endpoints ?? []).map((e) => e.path)
    expect(paths).not.toContain('/discounts/validate')
  })
})
