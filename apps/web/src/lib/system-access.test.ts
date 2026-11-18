import { describe, expect, it } from 'vitest'
import {
  allowedCsrfOrigins,
  canAccessAdminPanel,
  queryPresetsAccess,
  restrictLockedDocuments,
} from './system-access.ts'

const req = (roles: string[] | null) => ({ req: { user: roles ? { id: 9, roles } : null } })
const call = (fn: unknown, args: unknown): unknown => (fn as (a: unknown) => unknown)(args)

describe('audit 2026-11-18 H1 — admin panel is staff-only', () => {
  it('#730 customers and anonymous are refused; staff/manager/admin allowed', () => {
    expect(canAccessAdminPanel(req(null) as never)).toBe(false)
    expect(canAccessAdminPanel(req(['customer']) as never)).toBe(false)
    expect(canAccessAdminPanel(req([]) as never)).toBe(false)
    for (const role of ['staff', 'manager', 'admin']) {
      expect(canAccessAdminPanel(req([role]) as never)).toBe(true)
    }
  })
})

describe('audit 2026-11-18 H2 — system collections are staff-only', () => {
  it('#731 query presets: every operation refuses customers and anonymous', () => {
    for (const op of ['read', 'create', 'update', 'delete'] as const) {
      expect(call(queryPresetsAccess[op], req(['customer']))).toBe(false)
      expect(call(queryPresetsAccess[op], req(null))).toBe(false)
      expect(call(queryPresetsAccess[op], req(['staff']))).toBe(true)
    }
  })

  it('#732 locked documents: read narrowed to staff, other ops keep their original rule', () => {
    const original = { read: () => true, update: () => 'orig-update' }
    const payload = { collections: { 'payload-locked-documents': { config: { access: { ...original } } } } }
    restrictLockedDocuments(payload as never)
    const access = payload.collections['payload-locked-documents'].config.access as Record<string, unknown>
    expect(call(access.read, req(['customer']))).toBe(false)
    expect(call(access.read, req(null))).toBe(false)
    expect(call(access.read, req(['staff']))).toBe(true)
    expect(call(access.update, req(['customer']))).toBe('orig-update')
  })

  it('#733 locked documents: missing collection is a no-op (lockDocuments disabled)', () => {
    expect(() => restrictLockedDocuments({ collections: {} } as never)).not.toThrow()
  })
})

describe('audit 2026-11-18 L3 — CSRF allowlist', () => {
  it('#734 production trusts only BMR_URL (trailing slash trimmed), never localhost', () => {
    expect(allowedCsrfOrigins({ NODE_ENV: 'production', BMR_URL: 'https://shop.example.com/' })).toEqual([
      'https://shop.example.com',
    ])
  })
  it('#735 development adds the localhost origins', () => {
    expect(allowedCsrfOrigins({ NODE_ENV: 'development' })).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ])
  })
})
