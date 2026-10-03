import { describe, it, expect } from 'vitest'
import { maskInventoryRead, staffReadOnly } from './inventory-access.ts'

/**
 * Matrix row 13 (plan item C3, narrowing half): the raw `inventory` count is
 * staff+ only — public reads get the boolean via the product view.
 */
const fields = [
  { name: 'title', type: 'text' },
  { name: 'inventory', type: 'number', access: { update: () => false } },
  {
    type: 'tabs',
    tabs: [
      { label: 'Commerce', fields: [{ name: 'inventory', type: 'number' }] },
      { label: 'Other', fields: [{ name: 'sku', type: 'text' }] },
    ],
  },
  { type: 'group', name: 'stock', fields: [{ name: 'inventory', type: 'number' }] },
  { type: 'array', name: 'lots', fields: [{ name: 'inventory', type: 'number' }] },
] as never[]

describe('maskInventoryRead', () => {
  it('#269 pins every nested inventory field to the given read access', () => {
    const out = maskInventoryRead(fields, staffReadOnly) as Array<Record<string, unknown>>
    expect((out[1].access as Record<string, unknown>).read).toBe(staffReadOnly)
    const tabs = (out[2] as { tabs: Array<{ fields: Array<Record<string, unknown>> }> }).tabs
    expect((tabs[0].fields[0].access as Record<string, unknown>).read).toBe(staffReadOnly)
    const group = (out[3] as { fields: Array<Record<string, unknown>> }).fields
    expect((group[0].access as Record<string, unknown>).read).toBe(staffReadOnly)
    const array = (out[4] as { fields: Array<Record<string, unknown>> }).fields
    expect((array[0].access as Record<string, unknown>).read).toBe(staffReadOnly)
  })

  it('#270 preserves existing field access and leaves other fields untouched', () => {
    const out = maskInventoryRead(fields, staffReadOnly) as Array<Record<string, unknown>>
    // The pre-existing update lock survives the merge.
    expect((out[1].access as Record<string, unknown>).update).toBeTypeOf('function')
    expect(out[0].access).toBeUndefined()
    const other = (out[2] as { tabs: Array<{ fields: Array<Record<string, unknown>> }> }).tabs[1].fields[0]
    expect(other.access).toBeUndefined()
  })

  it('#271 staffReadOnly admits staff/manager/admin and rejects public/customer', () => {
    const req = (roles?: string[]) => ({ req: { user: roles ? { collection: 'users', roles } : null } })
    expect(staffReadOnly(req(['staff']) as never)).toBe(true)
    expect(staffReadOnly(req(['manager']) as never)).toBe(true)
    expect(staffReadOnly(req(['admin']) as never)).toBe(true)
    expect(staffReadOnly(req(['customer']) as never)).toBe(false)
    expect(staffReadOnly(req() as never)).toBe(false)
  })
})
