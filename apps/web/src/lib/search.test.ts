import { describe, expect, it } from 'vitest'
import { sanitizeSearchQuery } from './search'

/**
 * Step A (entry 18) - /shop/search query sanitisation. The value goes into a
 * payload `like` filter (parameterised, so no SQL injection), but `%`/`_`
 * are LIKE wildcards a user could use to turn a search into a table scan
 * (`%` alone matches everything) - strip them; cap length; control chars out.
 */
describe('sanitizeSearchQuery', () => {
  it('#105 trims, collapses whitespace and passes normal queries through', () => {
    expect(sanitizeSearchQuery('  rtx   4070  ')).toBe('rtx 4070')
    expect(sanitizeSearchQuery('mid-tower case')).toBe('mid-tower case')
  })

  it('#106 strips LIKE wildcards and control characters', () => {
    expect(sanitizeSearchQuery('100%_off\\')).toBe('100off')
    expect(sanitizeSearchQuery('a\u0000b\u0007c')).toBe('abc')
  })

  it('#107 non-strings, blanks and overlong input - null or capped', () => {
    expect(sanitizeSearchQuery(undefined)).toBeNull()
    expect(sanitizeSearchQuery(42)).toBeNull()
    expect(sanitizeSearchQuery('   ')).toBeNull()
    expect(sanitizeSearchQuery('%%%')).toBeNull()
    expect(sanitizeSearchQuery('x'.repeat(500))).toHaveLength(100)
  })
})
