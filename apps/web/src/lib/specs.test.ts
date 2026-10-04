import { describe, expect, it } from 'vitest'
import { specRows } from './specs'

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
