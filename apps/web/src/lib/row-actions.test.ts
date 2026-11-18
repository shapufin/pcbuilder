import { describe, expect, it } from 'vitest'
import { rowDeletePlan } from './row-actions.ts'

/**
 * Phase 4 / task 4.2 — trash.
 *
 * Payload's own delete button does *not* call `DELETE`: on a trash-enabled
 * collection it PATCHes `{ deletedAt }` (payload/ui/dist/elements/
 * DeleteDocument — `requests.patch`), and only `DELETE` when the user holds
 * the permanent-delete permission. Our injected row action predates trash and
 * always hard-deletes, so enabling trash without this would leave the most
 * used delete affordance silently bypassing recovery.
 */
describe('row delete plan (#698 - #701)', () => {
  const now = new Date('2026-10-22T10:00:00.000Z')

  it('#698 a trash-enabled collection trashes instead of deleting', () => {
    const plan = rowDeletePlan({ collectionSlug: 'products', id: 7, trash: true, now })
    expect(plan.kind).toBe('trash')
    if (plan.kind !== 'trash') throw new Error('unreachable')
    expect(plan.method).toBe('PATCH')
    expect(plan.url).toBe('/api/products/7')
    expect(plan.body).toEqual({ deletedAt: '2026-10-22T10:00:00.000Z' })
    expect(plan.description.toLowerCase()).toContain('restore')
  })

  it('#699 a collection without trash keeps the permanent delete', () => {
    const plan = rowDeletePlan({ collectionSlug: 'brands', id: 3, now })
    expect(plan.kind).toBe('permanent')
    if (plan.kind !== 'permanent') throw new Error('unreachable')
    expect(plan.method).toBe('DELETE')
    expect(plan.url).toBe('/api/brands/3')
    expect(plan.description.toLowerCase()).toContain('cannot be undone')
  })

  it('#700 the trash view hides the row delete action (restore lives in the document view)', () => {
    expect(rowDeletePlan({ collectionSlug: 'products', id: 7, trash: true, viewType: 'trash', now }).kind).toBe(
      'hidden',
    )
    expect(rowDeletePlan({ collectionSlug: 'brands', id: 7, viewType: 'trash', now }).kind).toBe(
      'hidden',
    )
  })

  it('#701 a row with no id cannot be deleted', () => {
    expect(rowDeletePlan({ collectionSlug: 'products', id: undefined, trash: true, now }).kind).toBe(
      'hidden',
    )
    expect(rowDeletePlan({ collectionSlug: 'products', id: null, now }).kind).toBe('hidden')
  })
})
