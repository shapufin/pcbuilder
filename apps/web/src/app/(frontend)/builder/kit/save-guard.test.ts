import { describe, expect, it } from 'vitest'
import { canReuseInflight, draftSignature, shouldApplySavedBuild } from './save-guard'

describe('save-guard — entry-55 review M1 race semantics', () => {
  it('#378 shouldApplySavedBuild stamps only when the live draft matches the snapshot', () => {
    const draft = { cpu: ['c1'], ram: ['r1', 'r2'] }
    const sig = draftSignature(draft)
    expect(shouldApplySavedBuild({ buildId: null, selections: draft }, sig)).toBe(true)
    // selection changed mid-flight → the response describes a stale doc
    expect(shouldApplySavedBuild({ buildId: null, selections: { ...draft, ram: ['r3'] } }, sig)).toBe(false)
    // a newer save already stamped — never overwrite
    expect(shouldApplySavedBuild({ buildId: 'b2', selections: draft }, sig)).toBe(false)
  })

  it('#379 canReuseInflight reuses only a same-signature in-flight save', () => {
    const draft = { cpu: ['c1'] }
    const sig = draftSignature(draft)
    expect(canReuseInflight({ signature: sig }, sig)).toBe(true)
    expect(canReuseInflight({ signature: draftSignature({ cpu: ['c9'] }) }, sig)).toBe(false)
    expect(canReuseInflight(null, sig)).toBe(false)
  })

  it('#380 draftSignature distinguishes key presence and values', () => {
    expect(draftSignature({})).not.toBe(draftSignature({ cpu: [] }))
    expect(draftSignature({ cpu: ['a'] })).not.toBe(draftSignature({ cpu: ['b'] }))
    expect(draftSignature({ cpu: ['a', 'b'] })).not.toBe(draftSignature({ cpu: ['b', 'a'] }))
  })
})
