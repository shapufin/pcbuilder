import { describe, expect, it } from 'vitest'
import { slotComponentIds, templateBasePrice } from './template-price.ts'

const priced = (id: string, price?: number) => ({
  id,
  productVariant: price === undefined ? undefined : { priceInEUR: price },
})

describe('slotComponentIds', () => {
  it('extracts unique component ids from slots (string ids, object refs, null, repeats)', () => {
    const slots = [
      { component: 'c1' },
      { component: { id: 42 } },
      { component: null },
      { component: 'c1' },
      {},
    ]
    expect(slotComponentIds(slots)).toEqual(['c1', '42'])
  })

  it('returns [] for empty or missing slots', () => {
    expect(slotComponentIds(undefined)).toEqual([])
    expect(slotComponentIds(null)).toEqual([])
    expect(slotComponentIds([])).toEqual([])
  })
})

describe('templateBasePrice', () => {
  it('sums variant prices of the components referenced by slots', () => {
    const comps = [priced('c1', 100), priced('c2', 50.5), { id: 'c3' }]
    expect(templateBasePrice(['c1', 'c2'], comps)).toBe(150.5)
    expect(templateBasePrice([], comps)).toBe(0)
  })

  it('counts a component once per slot occurrence', () => {
    expect(templateBasePrice(['c1', 'c1'], [priced('c1', 100)])).toBe(200)
  })

  it('ignores components without a priced variant and unknown ids', () => {
    expect(templateBasePrice(['c3', 'missing'], [{ id: 'c3' }])).toBe(0)
  })

  it('ignores null/undefined priceInEUR', () => {
    const comps = [{ id: 'a', productVariant: { priceInEUR: null as unknown as number } }]
    expect(templateBasePrice(['a'], comps)).toBe(0)
  })
})
