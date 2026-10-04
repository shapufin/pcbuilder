import { describe, expect, it } from 'vitest'
import { compatRows, specRows } from './specs'

/**
 * Product spec table (entry 61, audit S3 gap): specsJson can hold nested
 * objects/arrays — String(v) rendered "[object Object]". specRows flattens
 * to {key,value} display rows: nested objects become dot-path keys, arrays
 * join readably, null renders an em dash.
 */
describe('specRows — specsJson display flattening', () => {
  it('#409 flat primitives pass through unchanged', () => {
    expect(specRows({ socket: 'AM5', tdp: 105, modular: true })).toEqual([
      { key: 'socket', value: 'AM5' },
      { key: 'tdp', value: '105' },
      { key: 'modular', value: 'true' },
    ])
  })

  it('#410 nested objects flatten to dot-path rows', () => {
    expect(
      specRows({ dimensions: { lengthMm: 450, widthMm: 210 }, weight: '8kg' }),
    ).toEqual([
      { key: 'dimensions.lengthMm', value: '450' },
      { key: 'dimensions.widthMm', value: '210' },
      { key: 'weight', value: '8kg' },
    ])
  })

  it('#411 arrays of primitives join with commas', () => {
    expect(specRows({ fanHeaders: ['cpu', 'sys1', 'sys2'] })).toEqual([
      { key: 'fanHeaders', value: 'cpu, sys1, sys2' },
    ])
  })

  it('#412 arrays of objects render each item as k: v pairs', () => {
    const rows = specRows({
      ports: [
        { type: 'usb-c', count: 1 },
        { type: 'usb-a', count: 2 },
      ],
    })
    expect(rows).toEqual([
      { key: 'ports', value: 'type: usb-c, count: 1; type: usb-a, count: 2' },
    ])
  })

  it('#413 null/undefined render an em dash; empty objects too', () => {
    expect(specRows({ warranty: null, extra: {} })).toEqual([
      { key: 'warranty', value: '—' },
      { key: 'extra', value: '—' },
    ])
  })

  it('#414 missing/empty specsJson yields no rows (page shows fallback)', () => {
    expect(specRows(null)).toEqual([])
    expect(specRows(undefined)).toEqual([])
    expect(specRows({})).toEqual([])
  })
})

/**
 * PDP compatibility list (entry 64, audit S3 "compat hint is a stub"):
 * renders the product's attributeValues (attribute-type name + value)
 * with a builder link — real data instead of a placeholder link.
 */
describe('compatRows — PDP compatibility list', () => {
  it('#421 populated refs render name/value rows; displayLabel wins', () => {
    const rows = compatRows([
      { attributeType: { id: 1, name: 'Socket' }, value: { id: 11, value: 'AM5' } },
      {
        attributeType: { id: 2, name: 'Wattage' },
        value: { id: 13, value: '750', displayLabel: '750 W' },
      },
    ])
    expect(rows).toEqual([
      { name: 'Socket', value: 'AM5' },
      { name: 'Wattage', value: '750 W' },
    ])
  })

  it('#422 unresolved id refs are skipped; non-arrays yield nothing', () => {
    expect(compatRows([{ attributeType: 1, value: 11 }])).toEqual([])
    expect(compatRows([{ attributeType: null, value: null }])).toEqual([])
    expect(compatRows([null, 'x', 42])).toEqual([])
    expect(compatRows(undefined)).toEqual([])
    expect(compatRows({})).toEqual([])
  })

  it('#423 blank displayLabel falls back to the raw value; nameless type skipped', () => {
    expect(
      compatRows([
        { attributeType: { name: 'Form Factor' }, value: { value: 'ATX', displayLabel: '  ' } },
        { attributeType: { name: '' }, value: { value: 'x' } },
      ]),
    ).toEqual([{ name: 'Form Factor', value: 'ATX' }])
  })
})
