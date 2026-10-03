import { describe, it, expect } from 'vitest'
import { ConfiguredBuilds } from './configured-builds.ts'

const access = ConfiguredBuilds.access as Record<string, unknown>
const call = (fn: unknown, args: unknown): unknown => (fn as (a: unknown) => unknown)(args)

const asReq = (user: { id?: unknown; roles?: string[] | null } | null) => ({ req: { user } })

describe('configured-builds access — entry 11 matrix alignment', () => {
  it('#51 read: anon denied; staff/manager/admin unscoped; owner self-scoped where', () => {
    expect(call(access.read, asReq(null))).toBe(false)
    expect(call(access.read, asReq({ id: 4, roles: ['staff'] }))).toBe(true)
    expect(call(access.read, asReq({ id: 5, roles: ['manager'] }))).toBe(true)
    expect(call(access.read, asReq({ id: 1, roles: ['admin'] }))).toBe(true)
    // non-staff account (no roles) — falls back to owner-scoped where
    expect(call(access.read, asReq({ id: 9 }))).toEqual({
      user: { equals: 9 },
    })
  })

  it('#52 write: admin unscoped; non-admin scoped to own builds (never blanket-true)', () => {
    expect(call(access.update, asReq(null))).toBe(false)
    expect(call(access.delete, asReq(null))).toBe(false)
    expect(call(access.update, asReq({ id: 1, roles: ['admin'] }))).toBe(true)
    expect(call(access.delete, asReq({ id: 1, roles: ['admin'] }))).toBe(true)
    // staff/manager/owner all come back where-scoped to their own id — a
    // returned where never matches someone else's doc, so escalation is denied.
    expect(call(access.update, asReq({ id: 4, roles: ['staff'] }))).toEqual({
      user: { equals: 4 },
    })
    expect(call(access.update, asReq({ id: 5, roles: ['manager'] }))).toEqual({
      user: { equals: 5 },
    })
    expect(call(access.update, asReq({ id: 9 }))).toEqual({ user: { equals: 9 } })
  })
})

/**
 * Entry 44 review (R3-C1): `data` in a beforeChange update is the *partial*
 * incoming payload — minting shareId when absent rotated the token on every
 * claim/add-to-cart write, 404ing the share link. Minting is create-only.
 */
describe('configured-builds shareId — entry 44 (#274–275)', () => {
  const hook = (ConfiguredBuilds.hooks?.beforeChange?.[0]) as (args: {
    data: Record<string, unknown>
    req: unknown
    operation?: string
    originalDoc?: Record<string, unknown>
  }) => Promise<unknown>

  it('#274 update without shareId does NOT rotate it (claim / add-to-cart writes)', async () => {
    const data: Record<string, unknown> = { status: 'addedToCart' }
    await hook({ data, req: { payload: {} }, operation: 'update', originalDoc: { shareId: 'abc123' } })
    expect(data.shareId).toBeUndefined()
    // and even without an originalDoc hint, an update never mints
    await hook({ data, req: { payload: {} }, operation: 'update' })
    expect(data.shareId).toBeUndefined()
  })

  it('#275 create without shareId still mints one', async () => {
    const data: Record<string, unknown> = {}
    await hook({ data, req: { payload: {} }, operation: 'create' })
    expect(typeof data.shareId).toBe('string')
    expect((data.shareId as string).length).toBe(16) // 96-bit base64url
  })
})

describe('configured-builds rgbColor — entry 50', () => {
  it('#317 field-level validate accepts only #RRGGBB (staff creates included)', () => {
    const field = ConfiguredBuilds.fields.find(
      (f) => 'name' in f && f.name === 'rgbColor',
    ) as { validate?: (v: unknown) => unknown }
    expect(typeof field.validate).toBe('function')
    const validate = field.validate!
    expect(validate('#7df4ff')).toBe(true)
    expect(validate('notacolor')).not.toBe(true)
    expect(validate('#12345')).not.toBe(true)
    expect(validate(undefined)).toBe(true)
    expect(validate(null)).toBe(true)
  })
})
