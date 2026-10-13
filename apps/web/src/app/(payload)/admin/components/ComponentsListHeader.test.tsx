import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComponentsListHeader } from './ComponentsListHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/collections/components',
  useSearchParams: () => new URLSearchParams(),
}))

describe('ComponentsListHeader (#520 - #524)', () => {
  it('#520 renders 4-card telemetry ribbon with default component stats', () => {
    const html = renderToStaticMarkup(<ComponentsListHeader />)
    expect(html).toContain('TOTAL HARDWARE')
    expect(html).toContain('31')
    expect(html).toContain('HARDWARE SLOTS')
    expect(html).toContain('9')
    expect(html).toContain('COMPATIBILITY RULES')
    expect(html).toContain('42')
    expect(html).toContain('PLATFORM ARCHITECTURES')
    expect(html).toContain('3')
  })

  it('#521 renders custom hardware stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <ComponentsListHeader
        stats={{
          totalCount: 48,
          slotCount: 10,
          ruleCount: 56,
          platformCount: 4,
        }}
      />
    )
    expect(html).toContain('48')
    expect(html).toContain('10')
    expect(html).toContain('56')
    expect(html).toContain('4')
  })

  it('#522 renders operational notice banner with rule engine sync status', () => {
    const html = renderToStaticMarkup(<ComponentsListHeader />)
    expect(html).toContain('COMPATIBILITY')
    expect(html).toContain('Rule Engine Integration')
    expect(html).toContain('42 active compatibility rules safeguard this component matrix')
  })

  it('#523 renders facet filter pills for hardware matrix', () => {
    const html = renderToStaticMarkup(<ComponentsListHeader />)
    expect(html).toContain('All Components')
    expect(html).toContain('Platform AM5')
    expect(html).toContain('Platform LGA1700')
    expect(html).toContain('Platform LGA1851')
  })

  it('#524 renders quick actions including Export Specs CSV and Add Component button', () => {
    const html = renderToStaticMarkup(<ComponentsListHeader />)
    expect(html).toContain('Export Specs')
    expect(html).toContain('Add Component')
    // Create opens the slide-over DocumentDrawer, tagged with the slug
    expect(html).toContain('data-create-drawer="components"')
    expect(html).not.toContain('/admin/collections/components/create')
  })
})
