import { describe, it, expect } from 'vitest'
import { Media } from './media.ts'

const access = Media.access as Record<string, unknown>
const call = (fn: unknown, args: unknown): unknown => (fn as (a: unknown) => unknown)(args)

const asReq = (user: { roles?: string[] | null } | null) => ({ req: { user } })

describe('media access + upload config — entry 11', () => {
  it('#49 write is staff+, read stays public', () => {
    expect(call(access.create, asReq(null))).toBe(false)
    expect(call(access.create, asReq({}))).toBe(false)
    expect(call(access.create, asReq({ roles: ['staff'] }))).toBe(true)
    expect(call(access.create, asReq({ roles: ['manager'] }))).toBe(true)
    expect(call(access.create, asReq({ roles: ['admin'] }))).toBe(true)
    expect(call(access.update, asReq({ roles: ['staff'] }))).toBe(true)
    expect(call(access.update, asReq(null))).toBe(false)
    expect(call(access.delete, asReq({ roles: ['staff'] }))).toBe(true)
    expect(call(access.delete, asReq(null))).toBe(false)
    expect(call(access.read, asReq(null))).toBe(true)
  })

  it('#50 upload mimeTypes are the exact jpeg/png/webp/avif whitelist — no SVG', () => {
    const mimeTypes = (Media.upload as { mimeTypes?: string[] }).mimeTypes
    expect(mimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    expect(mimeTypes?.some((m) => m.includes('svg'))).toBe(false)
  })
})
