import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComponentCategoriesListHeader } from './ComponentCategoriesListHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/collections/component-categories',
  useSearchParams: () => new URLSearchParams(),
}))

describe('ComponentCategoriesListHeader (#550 - #554)', () => {
  it('#550 renders 4-card telemetry ribbon with default category slot stats', () => {
    const html = renderToStaticMarkup(<ComponentCategoriesListHeader />)
    expect(html).toContain('TOTAL SLOTS')
    expect(html).toContain('8')
    expect(html).toContain('MANDATORY SLOTS')
    expect(html).toContain('6')
    expect(html).toContain('OPTIONAL SLOTS')
    expect(html).toContain('2')
    expect(html).toContain('MULTI-SELECT SLOTS')
  })

  it('#551 renders custom category slot stats when provided via props', () => {
    const html = renderToStaticMarkup(
      <ComponentCategoriesListHeader
        stats={{
          totalCount: 14,
          requiredCount: 8,
          optionalCount: 6,
          multiSelectCount: 4,
        }}
      />
    )
    expect(html).toContain('14')
    expect(html).toContain('8')
    expect(html).toContain('6')
    expect(html).toContain('4')
  })

  it('#552 renders operational AlertBanner with schema cache invalidation notice', () => {
    const html = renderToStaticMarkup(<ComponentCategoriesListHeader />)
    expect(html).toContain('Hardware Slot Schema &amp; Rule Engine Invalidation')
    expect(html).toContain('immediately invalidate the builder index cache')
    expect(html).toContain('Compatibility Matrix')
  })

  it('#553 renders FilterPills facet rail with slot constraint filters', () => {
    const html = renderToStaticMarkup(<ComponentCategoriesListHeader />)
    expect(html).toContain('All Slots')
    expect(html).toContain('Mandatory')
    expect(html).toContain('Optional')
    expect(html).toContain('Multi-Select')
  })

  it('#554 renders header actions including Export CSV, Rule Matrix link, and Add Slot CTA', () => {
    const html = renderToStaticMarkup(<ComponentCategoriesListHeader />)
    expect(html).toContain('Export CSV')
    expect(html).toContain('Rule Matrix ↗')
    expect(html).toContain('Create Component Slot')
    expect(html).toContain('Builder Schema')
  })
})
