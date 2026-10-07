import { describe, expect, it } from 'vitest'
import {
  addSavedRef,
  parseSavedRefs,
  removeSavedRef,
  type SavedBuildRef,
} from './saved-refs'

/**
 * Entry 50 P4 (#353+): guest saved-build refs — localStorage pointers to real
 * server drafts ({shareId, name, savedAt, priceCents}). parse is never-throw:
 * a corrupt or foreign payload degrades to an empty list, never a crash.
 */

const ref = (shareId: string, name = 'Custom build'): SavedBuildRef => ({
  shareId,
  name,
  savedAt: 1700000000000,
  priceCents: 125000,
})

describe('saved-refs — entry 50 P4', () => {
  it('#353 parseSavedRefs is never-throw: null, garbage, wrong shapes → filtered', () => {
    expect(parseSavedRefs(null)).toEqual([])
    expect(parseSavedRefs('')).toEqual([])
    expect(parseSavedRefs('{bad json')).toEqual([])
    expect(parseSavedRefs('"just a string"')).toEqual([])
    expect(parseSavedRefs('{"not":"an array"}')).toEqual([])
    expect(
      parseSavedRefs(
        JSON.stringify([
          ref('abc'),
          { shareId: 42, name: 'x', savedAt: 1, priceCents: 2 }, // bad shareId
          { name: 'x', savedAt: 1, priceCents: 2 }, // missing shareId
          { shareId: 'def', name: 'x', savedAt: 'soon', priceCents: 2 }, // bad savedAt
          { shareId: 'ghi', name: 'x', savedAt: 1, priceCents: 'lots' }, // bad priceCents
        ]),
      ),
    ).toEqual([ref('abc')])
  })

  it('#354 addSavedRef dedupes by shareId (newest first) and keeps a prior name when incoming omits it', () => {
    const list = [ref('b'), ref('a')]
    // New shareId → prepended.
    const added = addSavedRef(list, ref('c', 'My rig'))
    expect(added.map((r) => r.shareId)).toEqual(['c', 'b', 'a'])
    expect(added[0].name).toBe('My rig')
    // Same shareId → replaced in place order-wise (moved to top), fields merge.
    const updated = addSavedRef(added, { shareId: 'a', savedAt: 5, priceCents: 9900 })
    expect(updated.map((r) => r.shareId)).toEqual(['a', 'c', 'b'])
    expect(updated[0]).toEqual({ shareId: 'a', name: 'Custom build', savedAt: 5, priceCents: 9900 })
    // An explicit incoming name wins over the stored one.
    const renamed = addSavedRef(updated, { shareId: 'a', name: 'Renamed', savedAt: 6, priceCents: 9900 })
    expect(renamed[0].name).toBe('Renamed')
    // Input list is not mutated.
    expect(list.map((r) => r.shareId)).toEqual(['b', 'a'])
  })

  it('#355 removeSavedRef drops only the matching shareId', () => {
    const list = [ref('b'), ref('a')]
    expect(removeSavedRef(list, 'a').map((r) => r.shareId)).toEqual(['b'])
    expect(removeSavedRef(list, 'ghost')).toEqual(list)
  })
})
