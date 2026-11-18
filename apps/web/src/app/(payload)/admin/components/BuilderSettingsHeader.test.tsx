import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BUILDER_DESIGNS } from '@buildmyrig/plugin-pc-builder/designs'
import {
  BuilderSettingsHeader,
  RENDERER_LABELS,
  RENDERER_OPTIONS_COUNT,
} from './BuilderSettingsHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/globals/builder-settings',
  useSearchParams: () => new URLSearchParams(),
}))

describe('BuilderSettingsHeader (#560 - #564)', () => {
  it('#560 renders 4-card telemetry ribbon with default builder engine stats', () => {
    const html = renderToStaticMarkup(<BuilderSettingsHeader />)
    expect(html).toContain('ACTIVE RENDERER')
    expect(html).toContain('RIG Studio')
    expect(html).toContain('RENDERER OPTIONS')
    expect(html).toContain('REQUIRED SLOTS')
    expect(html).toContain('MATRIX RULES')
  })

  it('#561 renders custom builder stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <BuilderSettingsHeader
        stats={{
          rendererLabel: 'Classic wizard',
          rendererOptions: 3,
          requiredSlots: 9,
          matrixRules: 57,
        }}
      />
    )
    expect(html).toContain('Classic wizard')
    expect(html).toContain('3')
    expect(html).toContain('9')
    expect(html).toContain('57')
  })

  it('#562 renders operational AlertBanner with renderer swap notice', () => {
    const html = renderToStaticMarkup(<BuilderSettingsHeader />)
    expect(html).toContain('Renderer Swap &amp; Storefront Propagation')
    expect(html).toContain('next storefront render')
    expect(html).toContain('Open Configurator')
  })

  it('#563 renders header actions including Configurator, Build Stats, and Rule Matrix links', () => {
    const html = renderToStaticMarkup(<BuilderSettingsHeader />)
    expect(html).toContain('Configurator ↗')
    expect(html).toContain('Build Stats ↗')
    expect(html).toContain('Rule Matrix ↗')
    // Storefront-facing links open a new tab so unsaved global edits aren't lost
    // (consistent with the sibling list-header convention).
    expect(html).toContain('target="_blank" rel="noopener noreferrer" href="/builder"')
  })

  it('#564 renders builder engine scope badge, scope chip, and subtitle', () => {
    const html = renderToStaticMarkup(<BuilderSettingsHeader />)
    expect(html).toContain('Builder Engine')
    expect(html).toContain('PC Builder · Rendering')
    expect(html).toContain('Storefront configurator renderer')
  })

  it('#685 admin renderer labels are the plugin registry, not a hand-kept copy', () => {
    // Entry 131: the old hardcoded map silently drifted whenever a design was
    // added — RENDERER OPTIONS would keep counting the stale map.
    const expected = Object.fromEntries(
      Object.entries(BUILDER_DESIGNS).map(([slug, def]) => [slug, def.label]),
    )
    expect(RENDERER_LABELS).toEqual(expected)
    expect(RENDERER_OPTIONS_COUNT).toBe(Object.keys(BUILDER_DESIGNS).length)
  })
})
