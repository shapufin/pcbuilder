import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RegistryListHeader, LIST_HEADER_REGISTRY } from './RegistryListHeader.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/admin/collections/categories',
  useSearchParams: () => new URLSearchParams(),
}))

const fakeResults = (entries: Record<string, number>) =>
  Object.fromEntries(Object.entries(entries).map(([k, totalDocs]) => [k, { totalDocs, docs: [] }]))

describe('LIST_HEADER_REGISTRY (#595 - #596)', () => {
  it('#595 every registry entry resolves exactly 4 metrics and survives null results', () => {
    for (const [slug, entry] of Object.entries(LIST_HEADER_REGISTRY)) {
      const metrics = entry.resolve({})
      expect(metrics, slug).toHaveLength(4)
      for (const m of metrics) {
        expect(m.label, `${slug} label`).toBeTruthy()
        expect(m.value, `${slug} value`).not.toBeUndefined()
      }
      // malformed/empty results must not throw
      expect(() => entry.resolve({ total: null })).not.toThrow()
    }
  })

  it('#596 categories entry maps query totals into the expected KPI slots', () => {
    const metrics = LIST_HEADER_REGISTRY.categories.resolve(
      fakeResults({ total: 11, topLevel: 9, published: 6, mapped: 30 }),
    )
    expect(metrics.map((m) => m.label)).toEqual([
      'TOTAL CATEGORIES',
      'TOP-LEVEL',
      'PUBLISHED',
      'PRODUCTS MAPPED',
    ])
    expect(metrics.map((m) => m.value)).toEqual([11, 9, 6, 30])
  })

  it('#601 non-versioned collections never query _status (400 on brands)', () => {
    // Only categories and pages enable versions.drafts — a `_status` where on
    // any other registry slug 400s with "path cannot be queried".
    const versioned = new Set(['categories', 'pages'])
    for (const [slug, entry] of Object.entries(LIST_HEADER_REGISTRY)) {
      if (versioned.has(slug)) continue
      const urls = entry.queries.map((q) => q.url).join(' ')
      const wheres = (entry.facets ?? []).map((f) => f.where ?? '').join(' ')
      expect(`${urls} ${wheres}`, slug).not.toContain('_status')
    }
  })
})

describe('RegistryListHeader (#597 - #598)', () => {
  it('#597 renders title, badge, KPI ribbon, facet rail and alert for a mapped slug', () => {
    const html = renderToStaticMarkup(
      <RegistryListHeader
        collectionSlug="categories"
        stats={fakeResults({ total: 11, topLevel: 9, published: 6, mapped: 30 })}
      />,
    )
    expect(html).toContain('bmr-collection-header')
    expect(html).toContain('bmr-badge')
    expect(html).toContain('TOTAL CATEGORIES')
    expect(html).toContain('>11<')
    expect(html).toContain('bmr-filter-pill')
    expect(html).toContain('bmr-alert-banner')
    // Create opens the slide-over DocumentDrawer, tagged with the slug
    expect(html).toContain('data-create-drawer="categories"')
    expect(html).not.toContain('/admin/collections/categories/create')
  })

  it('#598 renders nothing for collections outside the registry', () => {
    const html = renderToStaticMarkup(<RegistryListHeader collectionSlug="carts" />)
    expect(html).toBe('')
  })
})
