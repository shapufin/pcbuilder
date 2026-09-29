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
