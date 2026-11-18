import { describe, expect, it } from 'vitest'
import { shouldRevalidatePage } from './page-revalidate.ts'

/**
 * Phase 4 / task 4.1 — autosave on pages.
 *
 * Payload's Autosave element PATCHes `{ autosave: true, draft: true }` every
 * ~800ms while the editor types, and `updateDocument` runs the collection
 * `afterChange` hooks on every one of those saves (payload/dist/collections/
 * operations/utilities/update.js — no autosave guard around the hook loop).
 * The public page only ever renders the *published* row, so revalidating on a
 * draft autosave is pure cache churn: it throws away the rendered page on
 * every keystroke.
 *
 * Rule: revalidate when the save is (or stops being) publicly visible.
 */
describe('page revalidation decision (#694 - #697)', () => {
  it('#694 draft autosave on a never-published page does not revalidate', () => {
    expect(shouldRevalidatePage({ doc: { _status: 'draft' } })).toBe(false)
    expect(shouldRevalidatePage({ doc: { _status: 'draft' }, previousDoc: { _status: 'draft' } })).toBe(
      false,
    )
  })

  it('#695 publishing revalidates', () => {
    expect(shouldRevalidatePage({ doc: { _status: 'published' } })).toBe(true)
    expect(
      shouldRevalidatePage({ doc: { _status: 'published' }, previousDoc: { _status: 'draft' } }),
    ).toBe(true)
  })

  it('#696 unpublishing revalidates so the page stops serving', () => {
    expect(
      shouldRevalidatePage({ doc: { _status: 'draft' }, previousDoc: { _status: 'published' } }),
    ).toBe(true)
  })

  it('#697 a published page saved as published revalidates; missing status is treated as visible', () => {
    expect(
      shouldRevalidatePage({ doc: { _status: 'published' }, previousDoc: { _status: 'published' } }),
    ).toBe(true)
    // Collections without drafts omit `_status` entirely — those saves are live.
    expect(shouldRevalidatePage({ doc: {} })).toBe(true)
  })
})
