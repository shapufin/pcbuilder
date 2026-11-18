import { describe, it, expect, vi } from 'vitest'
import {
  Users,
  protectLastAdminDemotion,
  protectLastAdminDeletion,
} from './Users.ts'

const access = Users.access as Record<string, unknown>
const rolesField = Users.fields.find(
  (f) => (f as { name?: string }).name === 'roles',
) as {
  access?: Record<string, unknown>
  options?: (string | { value: string })[]
  defaultValue?: unknown
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

  it('#49 beforeDelete nullifies user foreign key on configured-builds', async () => {
    const beforeDeleteHooks = Users.hooks?.beforeDelete ?? []
    expect(beforeDeleteHooks.length).toBeGreaterThanOrEqual(1)

    const mockUpdate = vi.fn().mockResolvedValue({ docs: [] })
    const mockFindByID = vi.fn().mockResolvedValue({ id: 77, roles: ['customer'] })
    const req = {
      payload: {
        findByID: mockFindByID,
        find: vi.fn().mockResolvedValue({ totalDocs: 1 }),
        update: mockUpdate,
        logger: { error: vi.fn() },
      },
    }

    for (const hook of beforeDeleteHooks) {
      await (hook as any)({ req: req as any, id: 77, collection: Users as any })
    }

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'configured-builds',
        where: {
          user: { equals: 77 },
        },
        data: {
          user: null,
        },
      }),
    )
  })

  it('#50 beforeChange rejects demoting the last remaining admin', async () => {
    const mockFind = vi.fn().mockResolvedValue({ totalDocs: 0 })
    const req = { payload: { find: mockFind } }

    await expect(
      protectLastAdminDemotion({
        operation: 'update',
        originalDoc: { id: 1, roles: ['admin'] },
        data: { roles: ['customer'] },
        req: req as any,
      }),
    ).rejects.toThrow('Cannot demote the last remaining admin user.')

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        where: {
          and: [
            { roles: { contains: 'admin' } },
            { id: { not_equals: 1 } },
          ],
        },
      }),
    )
  })

  it('#51 beforeChange allows demoting an admin when another active admin exists', async () => {
    const mockFind = vi.fn().mockResolvedValue({ totalDocs: 1 })
    const req = { payload: { find: mockFind } }

    const res = await protectLastAdminDemotion({
      operation: 'update',
      originalDoc: { id: 1, roles: ['admin'] },
      data: { roles: ['manager'] },
      req: req as any,
    })

    expect(res).toEqual({ roles: ['manager'] })
  })

  it('#52 beforeDelete rejects deleting the last remaining admin', async () => {
    const mockFindByID = vi.fn().mockResolvedValue({ id: 1, roles: ['admin'] })
    const mockFind = vi.fn().mockResolvedValue({ totalDocs: 0 })
    const req = { payload: { findByID: mockFindByID, find: mockFind } }

    await expect(
      protectLastAdminDeletion({
        id: 1,
        req: req as any,
      }),
    ).rejects.toThrow('Cannot delete the last remaining admin user.')
  })
})

describe('users roles/auth config — entry 15 (least-privilege signup)', () => {
  it('#87 customer role exists with least-privilege default; login lockout enabled', () => {
    const values = (rolesField.options ?? []).map((o) => (typeof o === 'string' ? o : o.value))
    expect(values).toContain('customer')
    expect(rolesField.defaultValue).toEqual(['customer'])
    expect(Users.auth).toMatchObject({
      maxLoginAttempts: 5,
      lockTime: 10 * 60 * 1000,
    })
  })
})

describe('users access — audit 2026-11-18 H1 admin panel', () => {
  it('#738 access.admin admits staff roles only', () => {
    expect(call(access.admin, { req: { user: { id: 72, roles: ['customer'] } } })).toBe(false)
    expect(call(access.admin, { req: { user: null } })).toBe(false)
    expect(call(access.admin, { req: { user: { id: 3, roles: ['staff'] } } })).toBe(true)
    expect(call(access.admin, { req: { user: { id: 1, roles: ['admin'] } } })).toBe(true)
  })
})
