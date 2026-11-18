import { describe, expect, it } from 'vitest'
import { canSeeNavHref, navIdentity } from './nav-access.ts'

/**
 * Audit 2026-11-18 H3: the admin nav was a static list with a hardcoded
 * "Administrator / admin@buildmyrig.test" card — every role saw every link
 * and the wrong identity.
 */
const staffPerms = {
  collections: { orders: { read: true }, products: { read: true }, transactions: { read: true }, users: { read: true } },
  globals: { theme: { read: true } },
}
const legacyShape = { collections: { orders: { read: { permission: true } }, products: { read: { permission: false } } } }

describe('canSeeNavHref (audit 2026-11-18 H3)', () => {
  it('#754 collection and global links follow read permission (both permission shapes)', () => {
    expect(canSeeNavHref('/admin/collections/orders', staffPerms)).toBe(true)
    expect(canSeeNavHref('/admin/collections/discount-codes', staffPerms)).toBe(false)
    expect(canSeeNavHref('/admin/globals/theme', staffPerms)).toBe(true)
    expect(canSeeNavHref('/admin/globals/store-settings', staffPerms)).toBe(false)
    expect(canSeeNavHref('/admin/collections/orders', legacyShape)).toBe(true)
    expect(canSeeNavHref('/admin/collections/products', legacyShape)).toBe(false)
  })

  it('#755 custom views inherit the permission of the data they show', () => {
    expect(canSeeNavHref('/admin/compatibility-rules-manager', staffPerms)).toBe(false)
    expect(canSeeNavHref('/admin/compatibility-rules-manager', { collections: { 'compatibility-rules': { read: true } } })).toBe(true)
    expect(canSeeNavHref('/admin/plugins', staffPerms)).toBe(false)
    expect(canSeeNavHref('/admin/plugins', { globals: { 'store-settings': { update: true } } })).toBe(true)
  })

  it('#756 no permissions loaded → nothing visible (fail closed)', () => {
    expect(canSeeNavHref('/admin/collections/orders', undefined)).toBe(false)
  })
})

describe('navIdentity (audit 2026-11-18 H3)', () => {
  it('#757 shows the signed-in user, their top role and initials', () => {
    expect(navIdentity({ email: 'staff@buildmyrig.test', roles: ['staff'] })).toEqual({
      name: 'Staff',
      email: 'staff@buildmyrig.test',
      initials: 'ST',
    })
    expect(navIdentity({ email: 'jo.doe@x.io', name: 'Jo Doe', roles: ['manager', 'staff'] })).toEqual({
      name: 'Jo Doe · Manager',
      email: 'jo.doe@x.io',
      initials: 'JD',
    })
    expect(navIdentity(null)).toEqual({ name: 'Signed out', email: '', initials: '–' })
  })
})
