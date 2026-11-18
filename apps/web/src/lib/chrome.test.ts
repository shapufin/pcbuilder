import { describe, expect, it } from 'vitest'
import { CHROME_BOOT_SCRIPT, IMMERSIVE_PATHS, isImmersivePath, syncChrome } from './chrome.ts'

/**
 * Entry 131 — the builder design is the page's only chrome. These cases pin
 * the boundary: the configure route is immersive, its sibling routes (landing,
 * summary) keep the site header, and a lookalike prefix never matches.
 */
describe('immersive builder chrome (entry 131)', () => {
  it('#686 the configure route (and its sub-paths) is immersive', () => {
    expect(isImmersivePath('/builder/configure')).toBe(true)
    expect(isImmersivePath('/builder/configure/')).toBe(true)
    expect(isImmersivePath('/builder/configure?template=abc')).toBe(true)
    expect(isImmersivePath('/builder/configure/step-2')).toBe(true)
  })

  it('#687 sibling builder routes keep the site chrome', () => {
    expect(isImmersivePath('/builder')).toBe(false)
    expect(isImmersivePath('/builder/summary')).toBe(false)
    expect(isImmersivePath('/builder/configure-ish')).toBe(false)
    expect(isImmersivePath('/')).toBe(false)
    expect(isImmersivePath('')).toBe(false)
    expect(isImmersivePath(null)).toBe(false)
    expect(isImmersivePath(undefined)).toBe(false)
  })

  it('#688 the pre-paint script carries the same path list as the predicate', () => {
    for (const path of IMMERSIVE_PATHS) {
      expect(CHROME_BOOT_SCRIPT).toContain(JSON.stringify(path))
    }
    expect(CHROME_BOOT_SCRIPT).toContain("document.body.dataset.chrome='immersive'")
  })

  it('#704 data-chrome follows client-side navigation both ways', () => {
    // Round-2 audit F1: the boot script only runs on full loads — a client
    // nav INTO /builder/configure left the site chrome stacked, and nav OUT
    // left 'immersive' set (header/footer hidden site-wide until reload).
    const body = { dataset: {} as Record<string, string> }
    syncChrome('/builder/configure', body)
    expect(body.dataset.chrome).toBe('immersive')
    syncChrome('/', body)
    expect(body.dataset.chrome).toBeUndefined()
    syncChrome('/builder/configure?template=x', body)
    expect(body.dataset.chrome).toBe('immersive')
    syncChrome(null, body)
    expect(body.dataset.chrome).toBeUndefined()
  })
})
