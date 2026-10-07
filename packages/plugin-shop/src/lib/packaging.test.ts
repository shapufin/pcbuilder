import { describe, expect, it } from 'vitest'
import type { Payload } from 'payload'
import { getLineItemType } from '@buildmyrig/lib'
import {
  findEnabledPackagingTier,
  registerPackagingLineType,
  resolvePackagingTiers,
} from './packaging'

/**
 * Entry 71 (Nexus) — packaging tiers: resolver hardening + the 'packaging'
 * line type's server-side price resolution. Prices are never client-trusted.
 */

const TIERS_DOC = {
  tiers: [
    {
      id: 'crate',
      name: 'Shock-Mounted Flight Crate',
      badge: 'Default',
      description: 'Reinforced crate',
      features: [{ text: 'Air Freight: 24-48 Hours' }],
      priceCents: 0,
      enabled: true,
    },
    {
      id: 'pelican',
      name: 'Pelican Hard Case',
      priceCents: 14900,
      enabled: true,
    },
    { id: 'gone', name: 'Disabled tier', priceCents: 9900, enabled: false },
    { id: 'bad id!', name: 'Bad id' }, // dropped
    { id: 'crate', name: 'Dupe id' }, // dropped — first wins
    { name: 'No id' }, // dropped
    { id: 'no-name' }, // dropped
    { id: 'clamp', name: 'Clamp', priceCents: -5 },
  ],
}

const payloadStub = (doc: unknown): Payload =>
  ({
    findGlobal: async ({ slug }: { slug: string }) => {
      if (slug !== 'packaging-tiers') throw new Error('wrong global')
      if (doc instanceof Error) throw doc
      return doc
    },
  }) as unknown as Payload

describe('resolvePackagingTiers', () => {
  it('#445 unknown/missing doc -> empty tiers; rows cleaned, deduped, clamped', () => {
    expect(resolvePackagingTiers(null)).toEqual({ tiers: [] })
    expect(resolvePackagingTiers({})).toEqual({ tiers: [] })
    const { tiers } = resolvePackagingTiers(TIERS_DOC)
    expect(tiers.map((t) => t.id)).toEqual(['crate', 'pelican', 'gone', 'clamp'])
    expect(tiers[0]!.features).toEqual(['Air Freight: 24-48 Hours'])
    expect(tiers[1]!.features).toEqual([])
    expect(tiers[2]!.enabled).toBe(false)
    expect(tiers[3]!.priceCents).toBe(0) // negative clamped
  })
})

describe('packaging line type', () => {
  registerPackagingLineType()

  it('#446 registered as a closed-registry line type with a stock-units no-op', async () => {
    const type = getLineItemType('packaging')
    expect(type).not.toBeNull()
    expect(type!.slug).toBe('packaging')
    await expect(type!.resolveStockUnits!({}, payloadStub(null))).resolves.toEqual([])
  })

  it('#447 resolveLine prices from the global — enabled tier only, cents', async () => {
    const type = getLineItemType('packaging')!
    const payload = payloadStub(TIERS_DOC)
    const resolved = await type.resolveLine({ packagingTier: 'pelican' }, payload)
    expect(resolved.price).toBe(14900)
    expect(resolved.subItems).toEqual([])
    expect(resolved.fulfillmentUnits).toBe(0)
  })

  it('#448 unknown/disabled/empty tier ids fall back to price 0 gracefully', async () => {
    const type = getLineItemType('packaging')!
    const payload = payloadStub(TIERS_DOC)
    expect(await type.resolveLine({ packagingTier: 'gone' }, payload)).toEqual({
      price: 0,
      subItems: [],
      fulfillmentUnits: 0,
    })
    expect(await type.resolveLine({ packagingTier: 'nope' }, payload)).toEqual({
      price: 0,
      subItems: [],
      fulfillmentUnits: 0,
    })
    expect(await type.resolveLine({}, payload)).toEqual({
      price: 0,
      subItems: [],
      fulfillmentUnits: 0,
    })
    // Global fetch failure -> empty tiers -> price 0, never a crash.
    expect(
      await type.resolveLine({ packagingTier: 'pelican' }, payloadStub(new Error('db down'))),
    ).toEqual({
      price: 0,
      subItems: [],
      fulfillmentUnits: 0,
    })
  })

  it('#449 findEnabledPackagingTier filters disabled + missing global', async () => {
    expect(await findEnabledPackagingTier(payloadStub(TIERS_DOC), 'crate')).toMatchObject({
      id: 'crate',
      priceCents: 0,
    })
    expect(await findEnabledPackagingTier(payloadStub(TIERS_DOC), 'gone')).toBeUndefined()
    expect(await findEnabledPackagingTier(payloadStub(new Error('x')), 'crate')).toBeUndefined()
  })
})
