import { describe, expect, it } from 'vitest'
import { buildFacets, facetSelection } from './facets'

/**
 * Spec facets (entry 64, audit S2 gap): attribute-types/-values exist but
 * were never read. buildFacets aggregates per-value counts over a category's
 * products; facetSelection resolves `?socket=AM5`-style params to the
 * elemMatch where-clause (unknown slug/value ignored, never a dead filter).
 */
const TYPES = [
  { id: 1, name: 'Socket', slug: 'socket', unit: null },
  { id: 2, name: 'Wattage', slug: 'wattage', unit: 'W' },
]
const VALUES = [
  { id: 11, value: 'AM5', displayLabel: null, attributeType: 1 },
  { id: 12, value: 'LGA1700', displayLabel: null, attributeType: 1 },
  { id: 13, value: '750', displayLabel: '750 W', attributeType: 2 },
]
const product = (pairs: Array<[number, number]>) => ({
  attributeValues: pairs.map(([attributeType, value]) => ({ attributeType, value })),
})

describe('buildFacets', () => {
  it('#416 counts products per value, skips zero-count options, keeps type meta', () => {
    const products = [product([[1, 11]]), product([[1, 11]]), product([[1, 12], [2, 13]])]
    expect(buildFacets(products, TYPES, VALUES)).toEqual([
      {
        slug: 'socket',
        name: 'Socket',
        unit: null,
        options: [
          { value: 'AM5', label: 'AM5', count: 2 },
          { value: 'LGA1700', label: 'LGA1700', count: 1 },
        ],
      },
      {
        slug: 'wattage',
        name: 'Wattage',
        unit: 'W',
        options: [{ value: '750', label: '750 W', count: 1 }],
      },
    ])
  })

  it('#417 tolerates populated-object ids, missing attributeValues and duplicates', () => {
    const products = [
      { attributeValues: [{ attributeType: { id: 1 }, value: { id: 11 } }] },
      { attributeValues: [{ attributeType: 1, value: 11 }, { attributeType: 1, value: 11 }] },
      { attributeValues: null },
      {},
    ]
    const facets = buildFacets(products, TYPES, VALUES)
    expect(facets[0]!.options[0]).toEqual({ value: 'AM5', label: 'AM5', count: 2 })
    // LGA1700 has no products here — the whole socket facet still shows AM5.
    expect(facets[0]!.options).toHaveLength(1)
  })

  it('#418 returns no facets when nothing matches', () => {
    expect(buildFacets([], TYPES, VALUES)).toEqual([])
    expect(buildFacets([product([[9, 99]])], TYPES, VALUES)).toEqual([])
  })
})

describe('facetSelection', () => {
  it('#419 resolves an active facet param to a dotted-path clause', () => {
    const { active, where } = facetSelection(TYPES, VALUES, { socket: 'AM5' })
    expect(active).toEqual({ socket: 'AM5' })
    // elemMatch is rejected by payload on this array field (verified live) —
    // dotted subfield paths are the supported shape.
    expect(where).toEqual([
      {
        and: [
          { 'attributeValues.attributeType': { equals: 1 } },
          { 'attributeValues.value': { equals: 11 } },
        ],
      },
    ])
  })

  it('#419b composes multiple facet types and ignores unknown slug/value', () => {
    const { active, where } = facetSelection(TYPES, VALUES, {
      socket: 'AM5',
      wattage: '750',
      bogus: 'x',
      socket2: 'AM5',
      unknownValue: 'nope',
    })
    expect(active).toEqual({ socket: 'AM5', wattage: '750' })
    expect(where).toHaveLength(2)
  })

  it('#419c no facet params -> no clauses (plain category listing)', () => {
    expect(facetSelection(TYPES, VALUES, {})).toEqual({ active: {}, where: [] })
    // array-form search params (Next gives string[] for repeated keys)
    expect(facetSelection(TYPES, VALUES, { socket: ['AM5', 'LGA1700'] }).active).toEqual({
      socket: 'AM5',
    })
  })
})
