import { describe, expect, it } from 'vitest'
import { Reviews } from './reviews.ts'

describe('Reviews Collection', () => {
  it('has correct slug, group, and fields', () => {
    expect(Reviews.slug).toBe('reviews')
    expect(Reviews.admin?.group).toBe('Store')
    expect(Reviews.fields.length).toBeGreaterThanOrEqual(4)
  })

  it('restricts public read to approved status', () => {
    const readFn = Reviews.access?.read as (args: { req: { user?: unknown } }) => unknown
    expect(readFn).toBeDefined()

    // Public visitor
    const publicFilter = readFn({ req: { user: null } })
    expect(publicFilter).toEqual({ status: { equals: 'approved' } })

    // Staff member
    const staffAccess = readFn({ req: { user: { roles: ['staff'] } } })
    expect(staffAccess).toBe(true)
  })

  it('restricts collection create to staff only', () => {
    const createFn = Reviews.access?.create as (args: { req: { user?: unknown } }) => boolean
    expect(createFn).toBeDefined()
    expect(createFn({ req: { user: null } })).toBe(false)
    expect(createFn({ req: { user: { roles: ['customer'] } } })).toBe(false)
    expect(createFn({ req: { user: { roles: ['staff'] } } })).toBe(true)
  })
})
