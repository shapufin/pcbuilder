import { describe, expect, it } from 'vitest'
import { hasMojibake, repairMojibake } from './mojibake.ts'

// Literal CP1252-mangled sequences (what the DB actually held).
const BAD_DASH = 'Pre-built gaming and creator PCs, or configure your own \u00e2\u20ac\u201d step by step.'
const GOOD_DASH = 'Pre-built gaming and creator PCs, or configure your own \u2014 step by step.'

describe('mojibake repair (#677)', () => {
  it('restores an em dash mangled by a CP1252 round-trip', () => {
    expect(repairMojibake(BAD_DASH)).toBe(GOOD_DASH)
  })

  it('restores curly quotes, ellipsis and accents', () => {
    expect(repairMojibake('\u00e2\u20ac\u2122')).toBe('\u2019')
    expect(repairMojibake('\u00e2\u20ac\u00a6')).toBe('\u2026')
    expect(repairMojibake('Caf\u00c3\u00a9')).toBe('Caf\u00e9')
  })

  it('restores a euro sign mangled by the same round-trip (#681)', () => {
    // exactly what corrupted packages/lib/src/margin.test.ts
    expect(repairMojibake('\u00e2\u201a\u00ac1299')).toBe('\u20ac1299')
    expect(hasMojibake('\u00e2\u201a\u00ac1299')).toBe(true)
  })

  it('leaves clean text untouched', () => {
    expect(repairMojibake(GOOD_DASH)).toBe(GOOD_DASH)
    expect(repairMojibake('plain ascii')).toBe('plain ascii')
  })

  it('walks nested layout objects and arrays without mutating the input', () => {
    const input = { layout: [{ subheading: BAD_DASH, items: [{ quote: '\u00e2\u20ac\u2122' }] }] }
    const out = repairMojibake(input)
    expect(out.layout[0].subheading).toBe(GOOD_DASH)
    expect(out.layout[0].items[0].quote).toBe('\u2019')
    expect(input.layout[0].subheading).toBe(BAD_DASH)
  })

  it('hasMojibake flags mangled content and clears repaired content', () => {
    expect(hasMojibake(BAD_DASH)).toBe(true)
    expect(hasMojibake({ layout: [{ copy: BAD_DASH }] })).toBe(true)
    expect(hasMojibake(repairMojibake(BAD_DASH))).toBe(false)
    expect(hasMojibake(GOOD_DASH)).toBe(false)
    expect(hasMojibake(42)).toBe(false)
  })
})
