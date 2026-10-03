import { describe, it, expect } from 'vitest'
import { Categories } from './categories.ts'
import { Brands } from './brands.ts'
import { AttributeTypes } from './attribute-types.ts'
import { AttributeValues } from './attribute-values.ts'
import { Prices } from './prices.ts'
import { DiscountCodes } from './discount-codes.ts'
import { ordersCollectionOverride, restrictStaffStatus } from './orders.ts'
import { staffOrOwnAddressRead, transactionsAccess } from '../lib/access.ts'
import type { CollectionConfig, Field } from 'payload'

const call = (fn: unknown, args: unknown): unknown => (fn as (a: unknown) => unknown)(args)
const asReq = (user: { roles?: string[] | null } | null) => ({ req: { user } })
const accessOf = (c: CollectionConfig): Record<string, unknown> => c.access as Record<string, unknown>

describe('shop access matrix — entry 14 (11-access-security.md rows 11, 13, 14)', () => {
  it('#61 catalog collections: public read, write is manager+ only (staff read-only)', () => {
    const cols: Array<[string, CollectionConfig]> = [
      ['categories', Categories],
      ['brands', Brands],
      ['attribute-types', AttributeTypes],
      ['attribute-values', AttributeValues],
    ]
    // Draft-enabled collections gate public reads to _status=published
    // (#61b — anonymous ?draft=true must not leak unpublished docs).
    const publishedOnly = { _status: { equals: 'published' } }
    for (const [name, col] of cols) {
      const a = accessOf(col)
      const hasDrafts = typeof col.versions === 'object' && Boolean(col.versions.drafts)
      const expected = hasDrafts ? publishedOnly : true
      expect(call(a.read, asReq(null)), `${name}: public read`).toEqual(expected)
      expect(call(a.read, asReq({ roles: ['customer'] })), `${name}: customer read`).toEqual(expected)
      expect(call(a.read, asReq({ roles: ['staff'] })), `${name}: staff read`).toBe(true)
      expect(call(a.create, asReq({ roles: ['staff'] })), `${name}: staff create`).toBe(false)
      expect(call(a.update, asReq({ roles: ['staff'] })), `${name}: staff update`).toBe(false)
      expect(call(a.delete, asReq({ roles: ['staff'] })), `${name}: staff delete`).toBe(false)
      expect(call(a.create, asReq(null)), `${name}: guest create`).toBe(false)
      expect(call(a.create, asReq({ roles: ['manager'] })), `${name}: manager create`).toBe(true)
      expect(call(a.update, asReq({ roles: ['admin'] })), `${name}: admin update`).toBe(true)
    }
  })

  it('#62 prices: raw table hidden from public (inStock only via product view); staff read, manager+ write', () => {
    const a = accessOf(Prices)
    expect(call(a.read, asReq(null))).toBe(false)
    expect(call(a.read, asReq({ roles: [] }))).toBe(false)
    expect(call(a.read, asReq({ roles: ['staff'] }))).toBe(true)
    expect(call(a.read, asReq({ roles: ['manager'] }))).toBe(true)
    expect(call(a.create, asReq({ roles: ['staff'] }))).toBe(false)
    expect(call(a.update, asReq({ roles: ['staff'] }))).toBe(false)
    expect(call(a.create, asReq(null))).toBe(false)
    expect(call(a.create, asReq({ roles: ['manager'] }))).toBe(true)
    expect(call(a.update, asReq({ roles: ['admin'] }))).toBe(true)
  })

  it('#63 discount codes: no public/customer read (validate endpoint only); staff read, manager+ write', () => {
    const a = accessOf(DiscountCodes)
    expect(call(a.read, asReq(null))).toBe(false)
    expect(call(a.read, asReq({ roles: [] }))).toBe(false)
    expect(call(a.read, asReq({ roles: ['staff'] }))).toBe(true)
    expect(call(a.read, asReq({ roles: ['manager'] }))).toBe(true)
    expect(call(a.create, asReq({ roles: ['staff'] }))).toBe(false)
    expect(call(a.update, asReq({ roles: ['staff'] }))).toBe(false)
    expect(call(a.create, asReq(null))).toBe(false)
    expect(call(a.create, asReq({ roles: ['manager'] }))).toBe(true)
    expect(call(a.delete, asReq({ roles: ['admin'] }))).toBe(true)
  })
})

describe('transactions + addresses access — entry 43 matrix alignment (#272–273)', () => {
  it('#272 transactions: staff+ read; writes admin-only (spec row 17)', () => {
    for (const roles of [['staff'], ['manager'], ['admin']]) {
      expect(call(transactionsAccess.read, { req: { user: { collection: 'users', roles } } })).toBe(true)
    }
    expect(call(transactionsAccess.read, asReq({ roles: ['customer'] }))).toBe(false)
    expect(call(transactionsAccess.read, asReq(null))).toBe(false)
    for (const op of ['create', 'update', 'delete'] as const) {
      expect(call(transactionsAccess[op], asReq({ roles: ['admin'] })), `${op}: admin`).toBe(true)
      expect(call(transactionsAccess[op], asReq({ roles: ['manager'] })), `${op}: manager`).toBe(false)
      expect(call(transactionsAccess[op], asReq({ roles: ['staff'] })), `${op}: staff`).toBe(false)
    }
  })

  it('#273 addresses: staff+ read all; customers read only their own; anonymous none', () => {
    expect(call(staffOrOwnAddressRead, { req: { user: { id: 9, roles: ['staff'] } } })).toBe(true)
    expect(call(staffOrOwnAddressRead, { req: { user: { id: 9, roles: ['manager'] } } })).toBe(true)
    expect(call(staffOrOwnAddressRead, { req: { user: { id: 9, roles: ['admin'] } } })).toBe(true)
    // Customers get an ownership-scoped Where, not a blanket allow.
    expect(call(staffOrOwnAddressRead, { req: { user: { id: 42, roles: ['customer'] } } })).toEqual({
      customer: { equals: 42 },
    })
    expect(call(staffOrOwnAddressRead, asReq(null))).toBe(false)
  })
})

/**
 * Entry 20 review round: staff order fulfilment per 11-access-security.md —
 * collection update admits staff, field access pins every named field except
 * `status` to manager+, and restrictStaffStatus limits staff status values to
 * processing|completed (cancelled/refunded stay manager+; refunds admin-only).
 */
describe('orders fulfilment access — entry 20 review (#128-130)', () => {
  const fakeDefaultOrders = (): CollectionConfig =>
    ({
      fields: [
        {
          type: 'tabs',
          tabs: [
            {
              name: 'main',
              fields: [
                { name: 'items', type: 'array', fields: [{ name: 'quantity', type: 'number' }] },
                { name: 'amount', type: 'number' },
                { name: 'customer', type: 'relationship', relationTo: 'users' },
              ],
            },
          ],
        },
        { name: 'status', type: 'select', options: ['processing', 'completed', 'cancelled', 'refunded'] },
        { name: 'shippingAddress', type: 'group', fields: [{ name: 'city', type: 'text' }] },
        { name: 'transactions', type: 'relationship', relationTo: 'transactions', access: { update: () => false } },
      ],
      access: { create: () => false, read: () => false, update: () => false, delete: () => false },
      hooks: {},
    }) as unknown as CollectionConfig

  const findNamed = (fields: Field[], name: string): Field | undefined => {
    for (const field of fields) {
      if (!field || typeof field !== 'object') continue
      if ((field as { name?: string }).name === name) return field
      const nested =
        field.type === 'tabs'
          ? field.tabs.flatMap((tab) => tab.fields)
          : field.type === 'group' || field.type === 'row'
            ? field.fields
            : []
      const found = findNamed(nested as Field[], name)
      if (found) return found
    }
    return undefined
  }

  const fieldOf = (col: CollectionConfig, name: string): Field => {
    const found = findNamed(col.fields as Field[], name)
    expect(found, `field ${name} exists`).toBeTruthy()
    return found!
  }

  const fieldUpdate = (col: CollectionConfig, name: string): unknown =>
    (fieldOf(col, name) as { access?: { update?: unknown } }).access?.update

  it('#128 collection update admits staff; create/delete stay manager+; read unchanged', async () => {
    const col = ordersCollectionOverride({ defaultCollection: fakeDefaultOrders() })
    const a = accessOf(col)
    expect(call(a.update, asReq({ roles: ['staff'] }))).toBe(true)
    expect(call(a.update, asReq({ roles: ['manager'] }))).toBe(true)
    expect(call(a.update, asReq({ roles: ['admin'] }))).toBe(true)
    expect(call(a.update, asReq({ roles: ['customer'] }))).toBe(false)
    expect(call(a.update, asReq(null))).toBe(false)
    // create/delete keep the plugin defaults (manager+ only).
    expect(call(a.create, asReq({ roles: ['staff'] }))).toBe(false)
    expect(call(a.delete, asReq({ roles: ['staff'] }))).toBe(false)
    expect(call(a.create, asReq(null))).toBe(false)
  })

  it('#129 field access: staff may write only `status`; manager+ everything; stricter plugin rules kept', () => {
    const col = ordersCollectionOverride({ defaultCollection: fakeDefaultOrders() })
    const staff = asReq({ roles: ['staff'] })
    const manager = asReq({ roles: ['manager'] })
    expect(call(fieldUpdate(col, 'status') as never, staff)).toBe(true)
    expect(call(fieldUpdate(col, 'amount') as never, staff)).toBe(false)
    expect(call(fieldUpdate(col, 'items') as never, staff)).toBe(false)
    expect(call(fieldUpdate(col, 'shippingAddress') as never, staff)).toBe(false)
    expect(call(fieldUpdate(col, 'customer') as never, staff)).toBe(false)
    expect(call(fieldUpdate(col, 'amount') as never, manager)).toBe(true)
    expect(call(fieldUpdate(col, 'items') as never, manager)).toBe(true)
    // Pre-existing stricter field rule (transactions: admin-only) is preserved.
    expect(call(fieldUpdate(col, 'transactions') as never, manager)).toBe(false)
  })

  it('#130 restrictStaffStatus: staff limited to processing|completed, manager unrestricted, create ignored', async () => {
    const staffReq = { user: { roles: ['staff'] } }
    const managerReq = { user: { roles: ['manager'] } }
    await expect(
      restrictStaffStatus({ data: { status: 'refunded' }, req: staffReq, operation: 'update' }),
    ).rejects.toThrow(/processing or completed/)
    await expect(
      restrictStaffStatus({ data: { status: 'cancelled' }, req: staffReq, operation: 'update' }),
    ).rejects.toThrow(/processing or completed/)
    await expect(
      restrictStaffStatus({ data: { status: 'completed' }, req: staffReq, operation: 'update' }),
    ).resolves.toBeUndefined()
    await expect(
      restrictStaffStatus({ data: { status: 'processing' }, req: staffReq, operation: 'update' }),
    ).resolves.toBeUndefined()
    await expect(
      restrictStaffStatus({ data: {}, req: staffReq, operation: 'update' }),
    ).resolves.toBeUndefined()
    await expect(
      restrictStaffStatus({ data: { status: 'refunded' }, req: staffReq, operation: 'create' }),
    ).resolves.toBeUndefined()
    await expect(
      restrictStaffStatus({ data: { status: 'refunded' }, req: managerReq, operation: 'update' }),
    ).resolves.toBeUndefined()
  })

  it('#143 restrictStaffStatus: terminal states are manager-only; unchanged status is a no-op save', async () => {
    const staffReq = { user: { roles: ['staff'] } }
    const managerReq = { user: { roles: ['manager'] } }
    // Staff cannot resurrect cancelled/refunded orders (admin-training: terminal, manager+).
    await expect(
      restrictStaffStatus({
        data: { status: 'processing' },
        req: staffReq,
        operation: 'update',
        originalDoc: { status: 'cancelled' },
      }),
    ).rejects.toThrow(/terminal/)
    await expect(
      restrictStaffStatus({
        data: { status: 'completed' },
        req: staffReq,
        operation: 'update',
        originalDoc: { status: 'refunded' },
      }),
    ).rejects.toThrow(/terminal/)
    // A no-op save on a terminal order passes (payload admin submits the whole form).
    await expect(
      restrictStaffStatus({
        data: { status: 'cancelled' },
        req: staffReq,
        operation: 'update',
        originalDoc: { status: 'cancelled' },
      }),
    ).resolves.toBeUndefined()
    // Normal fulfilment moves still work with an originalDoc present.
    await expect(
      restrictStaffStatus({
        data: { status: 'completed' },
        req: staffReq,
        operation: 'update',
        originalDoc: { status: 'processing' },
      }),
    ).resolves.toBeUndefined()
    // Managers may un-terminal.
    await expect(
      restrictStaffStatus({
        data: { status: 'processing' },
        req: managerReq,
        operation: 'update',
        originalDoc: { status: 'cancelled' },
      }),
    ).resolves.toBeUndefined()
  })
})
