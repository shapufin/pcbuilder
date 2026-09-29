import { describe, it, expect } from 'vitest'
import { Categories } from './categories.ts'
import { Brands } from './brands.ts'
import { AttributeTypes } from './attribute-types.ts'
import { AttributeValues } from './attribute-values.ts'
import { Prices } from './prices.ts'
import { DiscountCodes } from './discount-codes.ts'
import type { CollectionConfig } from 'payload'

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
    for (const [name, col] of cols) {
      const a = accessOf(col)
      expect(call(a.read, asReq(null)), `${name}: public read`).toBe(true)
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
