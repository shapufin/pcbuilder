import { afterEach, describe, expect, it } from 'vitest'
import { dialogMotion, drawerMotion, prefersReducedMotion } from './motion'

/**
 * Entry 23 item 3 - shared motion values pin the 07-ux-plan animation spec:
 * dialog/sheet = scale .96→1 + fade 200ms; drawer slides in over
 * --duration-base (250ms) with the token ease-out curve; both collapse to a
 * fade under prefers-reduced-motion.
 */
describe('animation spec helpers', () => {
  it('#177 dialog: scale .96→1 + fade, 200ms, ease-out', () => {
    const m = dialogMotion(false)
    expect(m.initial).toEqual({ opacity: 0, scale: 0.96 })
    expect(m.animate).toEqual({ opacity: 1, scale: 1 })
    expect(m.exit).toEqual({ opacity: 0, scale: 0.96 })
    expect(m.transition).toEqual({ duration: 0.2, ease: [0.16, 1, 0.3, 1] })
  })

  it('#177b dialog under reduced motion: fade only, no scale', () => {
    const m = dialogMotion(true)
    expect(m.initial).toEqual({ opacity: 0 })
    expect(m.animate).toEqual({ opacity: 1 })
    expect(m.exit).toEqual({ opacity: 0 })
    expect(m.transition).toEqual({ duration: 0.15, ease: [0.16, 1, 0.3, 1] })
  })

  it('#177c drawer: slide x 100%→0 over 250ms; reduced motion fades instead', () => {
    const full = drawerMotion(false)
    expect(full.initial).toEqual({ x: '100%' })
    expect(full.animate).toEqual({ x: 0 })
    expect(full.exit).toEqual({ x: '100%' })
    expect(full.transition).toEqual({ duration: 0.25, ease: [0.16, 1, 0.3, 1] })

    const reduced = drawerMotion(true)
    expect(reduced.initial).toEqual({ opacity: 0 })
    expect(reduced.animate).toEqual({ opacity: 1 })
    expect(reduced.exit).toEqual({ opacity: 0 })
  })

  const prevWindow = globalThis.window

  afterEach(() => {
    if (prevWindow === undefined) {
      // @ts-expect-error test cleanup: restore the node env
      delete globalThis.window
    } else {
      globalThis.window = prevWindow
    }
  })

  it('#177d prefersReducedMotion is SSR-safe and reads matchMedia', () => {
    // node/vitest env: no window at all
    // @ts-expect-error deliberate: window absent in node env
    delete globalThis.window
    expect(prefersReducedMotion()).toBe(false)

    // @ts-expect-error test stub
    globalThis.window = { matchMedia: undefined }
    expect(prefersReducedMotion()).toBe(false)

    // @ts-expect-error test stub
    globalThis.window = { matchMedia: () => ({ matches: true }) }
    expect(prefersReducedMotion()).toBe(true)

    // @ts-expect-error test stub
    globalThis.window = { matchMedia: () => ({ matches: false }) }
    expect(prefersReducedMotion()).toBe(false)
  })
})
