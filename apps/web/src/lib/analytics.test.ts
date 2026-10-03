import { describe, it, expect, vi, afterEach } from 'vitest'
import { track, trackViewItem, trackBeginBuilder, trackBuildStepCompleted } from './analytics.ts'

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

describe('funnel events (audit gap P5-X3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete (globalThis as { window?: unknown }).window
  })

  const withPlausible = () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'buildmyrig.test')
    const spy = vi.fn()
    ;(globalThis as { window?: unknown }).window = { plausible: spy }
    return spy
  }

  it('#236 view_item carries the item and a EUR price', () => {
    const spy = withPlausible()
    trackViewItem('AMD Ryzen 5 7600X', 24900)
    expect(spy).toHaveBeenCalledWith('view_item', { props: { item: 'AMD Ryzen 5 7600X', price: 249 } })
    trackViewItem('Untracked')
    expect(spy).toHaveBeenLastCalledWith('view_item', { props: { item: 'Untracked' } })
  })

  it('#237 begin_builder names the template (custom when none)', () => {
    const spy = withPlausible()
    trackBeginBuilder('gaming-1440p')
    expect(spy).toHaveBeenCalledWith('begin_builder', { props: { template: 'gaming-1440p' } })
    trackBeginBuilder(null)
    expect(spy).toHaveBeenLastCalledWith('begin_builder', { props: { template: 'custom' } })
  })

  it('#238 build_step_completed reports step name, 1-based index and selection count', () => {
    const spy = withPlausible()
    trackBuildStepCompleted('CPU', 0, 1)
    expect(spy).toHaveBeenCalledWith('build_step_completed', {
      props: { step: 'CPU', step_index: 1, selected: 1 },
    })
  })

  it('#239 funnel helpers no-op without a configured domain (no PII leak paths)', () => {
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', '')
    const spy = vi.fn()
    ;(globalThis as { window?: unknown }).window = { plausible: spy }
    trackViewItem('X', 100)
    trackBeginBuilder('t')
    trackBuildStepCompleted('CPU', 0, 0)
    expect(spy).not.toHaveBeenCalled()
  })
})
