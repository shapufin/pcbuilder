import { describe, it, expect, vi, afterEach } from 'vitest'
import { track } from './analytics.ts'

type WindowWithPlausible = { plausible?: (e: string, opts?: { props?: object }) => void }

describe('analytics track() gating (entry 14)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete (globalThis as { window?: unknown }).window
  })

  it('#72 no Plausible domain configured → never calls window.plausible', () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', '')
    const spy = vi.fn()
    ;(globalThis as { window?: unknown }).window = { plausible: spy }
    track('Add to Cart', { item: 'CPU' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('#73 domain set → forwards event and props; missing script → no crash', () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'buildmyrig.test')
    const win: WindowWithPlausible = {}
    ;(globalThis as { window?: unknown }).window = win
    expect(() => track('Initiate Checkout')).not.toThrow()

    const spy = vi.fn()
    win.plausible = spy
    track('Add to Cart', { item: 'Ryzen 7 7800X3D' })
    expect(spy).toHaveBeenCalledWith('Add to Cart', { props: { item: 'Ryzen 7 7800X3D' } })

    delete (globalThis as { window?: unknown }).window
    expect(() => track('Add Build to Cart')).not.toThrow()
  })
})
