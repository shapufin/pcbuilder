import { describe, it, expect } from 'vitest'
import { Users } from './Users.ts'

const access = Users.access as Record<string, unknown>
const rolesField = Users.fields.find(
  (f) => (f as { name?: string }).name === 'roles',
) as {
  access?: Record<string, unknown>
}

const call = (fn: unknown, args: unknown): unknown => (fn as (a: unknown) => unknown)(args)

describe('users access — entry 11 privilege-escalation fix', () => {
  it('#45 create/delete are admin-only', () => {
    expect(call(access.create, { req: { user: { id: 4, roles: ['staff'] } } })).toBe(false)
    expect(call(access.create, { req: { user: { id: 5, roles: ['manager'] } } })).toBe(false)
    expect(call(access.create, { req: { user: { id: 1, roles: ['admin'] } } })).toBe(true)
    expect(call(access.create, { req: { user: null } })).toBe(false)
    expect(call(access.delete, { req: { user: { id: 4, roles: ['staff'] } } })).toBe(false)
    expect(call(access.delete, { req: { user: { id: 1, roles: ['admin'] } } })).toBe(true)
  })

  it('#46 update: admin may touch any id; self allowed (number or string id); others denied', () => {
    const staff = { id: 4, roles: ['staff'] }
    expect(call(access.update, { req: { user: staff }, id: 4 })).toBe(true)
    expect(call(access.update, { req: { user: staff }, id: '4' })).toBe(true)
    expect(call(access.update, { req: { user: staff }, id: 2 })).toBe(false)
    expect(call(access.update, { req: { user: staff }, id: '2' })).toBe(false)
    expect(call(access.update, { req: { user: { id: 1, roles: ['admin'] } }, id: 4 })).toBe(true)
    expect(call(access.update, { req: { user: null }, id: 4 })).toBe(false)
  })

  it('#47 read: anon false, admin unscoped, non-admin self-scoped where', () => {
    expect(call(access.read, { req: { user: null } })).toBe(false)
    expect(call(access.read, { req: { user: { id: 1, roles: ['admin'] } } })).toBe(true)
    expect(call(access.read, { req: { user: { id: 4, roles: ['staff'] } } })).toEqual({
      id: { equals: 4 },
    })
  })

  it('#48 roles field create/update: admin only — blocks self-escalation', () => {
    const staff = { req: { user: { id: 4, roles: ['staff'] } } }
    const admin = { req: { user: { id: 1, roles: ['admin'] } } }
    expect(call(rolesField.access?.update, staff)).toBe(false)
    expect(call(rolesField.access?.create, staff)).toBe(false)
    expect(call(rolesField.access?.update, admin)).toBe(true)
    expect(call(rolesField.access?.create, admin)).toBe(true)
  })
})
