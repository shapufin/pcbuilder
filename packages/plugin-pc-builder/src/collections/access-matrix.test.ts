import { describe, it, expect } from 'vitest'
import { Components } from './components.ts'
import { ComponentCategories } from './component-categories.ts'
import { BuildTemplates } from './build-templates.ts'
import { CompatibilityRules } from './compatibility-rules.ts'
import { DerivedPowerRules } from './derived-power-rules.ts'
import type { CollectionConfig } from 'payload'

const call = (fn: unknown, args: unknown): unknown => (fn as (a: unknown) => unknown)(args)
const asReq = (user: { roles?: string[] | null } | null) => ({ req: { user } })

const accessOf = (c: CollectionConfig): Record<string, unknown> => c.access as Record<string, unknown>

// 11-access-security.md matrix rows 21-22 (entry 14 tightening).
const contentCollections: Array<[string, CollectionConfig]> = [
  ['components', Components],
  ['component-categories', ComponentCategories],
  ['build-templates', BuildTemplates],
]

describe('builder access matrix — entry 14 (11-access-security.md rows 21-22)', () => {
  it('#59 content collections: public/staff read, write is manager+ only (staff is read-only)', () => {
    for (const [name, col] of contentCollections) {
      const a = accessOf(col)
      expect(call(a.read, asReq(null)), `${name}: public read`).toBe(true)
      expect(call(a.read, asReq({ roles: ['staff'] })), `${name}: staff read`).toBe(true)
      expect(call(a.create, asReq(null)), `${name}: guest create`).toBe(false)
      expect(call(a.create, asReq({ roles: ['staff'] })), `${name}: staff create`).toBe(false)
      expect(call(a.update, asReq({ roles: ['staff'] })), `${name}: staff update`).toBe(false)
      expect(call(a.delete, asReq({ roles: ['staff'] })), `${name}: staff delete`).toBe(false)
      expect(call(a.create, asReq({ roles: ['manager'] })), `${name}: manager create`).toBe(true)
      expect(call(a.update, asReq({ roles: ['manager'] })), `${name}: manager update`).toBe(true)
      expect(call(a.delete, asReq({ roles: ['admin'] })), `${name}: admin delete`).toBe(true)
    }
  })

  it('#60 compat/power rules: raw REST hidden from public and customers; staff read, manager+ write', () => {
    for (const [name, col] of [
      ['compatibility-rules', CompatibilityRules],
      ['derived-power-rules', DerivedPowerRules],
    ] as Array<[string, CollectionConfig]>) {
      const a = accessOf(col)
      expect(call(a.read, asReq(null)), `${name}: public raw read`).toBe(false)
      expect(call(a.read, asReq({ roles: [] })), `${name}: customer raw read`).toBe(false)
      expect(call(a.read, asReq({ roles: ['staff'] })), `${name}: staff read`).toBe(true)
      expect(call(a.read, asReq({ roles: ['manager'] })), `${name}: manager read`).toBe(true)
      expect(call(a.create, asReq({ roles: ['staff'] })), `${name}: staff create`).toBe(false)
      expect(call(a.update, asReq({ roles: ['staff'] })), `${name}: staff update`).toBe(false)
      expect(call(a.create, asReq(null)), `${name}: guest create`).toBe(false)
      expect(call(a.create, asReq({ roles: ['manager'] })), `${name}: manager create`).toBe(true)
      expect(call(a.update, asReq({ roles: ['admin'] })), `${name}: admin update`).toBe(true)
      expect(call(a.delete, asReq({ roles: ['admin'] })), `${name}: admin delete`).toBe(true)
    }
  })
})
