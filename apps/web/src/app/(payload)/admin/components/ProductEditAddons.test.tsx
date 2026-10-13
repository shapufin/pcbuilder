import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SerpPreviewField, serpPreviewFrom } from './SerpPreviewField.tsx'
import { BuilderRulesTabField } from './BuilderRulesTabField.tsx'

vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => ({
    id: 41,
    collectionSlug: 'products',
    data: {
      title: 'ASUS ROG Strix RTX 4080 Super',
      slug: 'asus-rog-strix-rtx-4080-super',
      description: 'Flagship 4K graphics card with 16GB GDDR6X.',
    },
  }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => '/admin/collections/products/41',
}))

describe('SerpPreviewField — Google SERP preview (#622 - #623)', () => {
  it('#622 builds the preview model from live form fields', () => {
    const html = renderToStaticMarkup(<SerpPreviewField />)
    expect(html).toContain('bmr-serp-preview')
    expect(html).toContain('ASUS ROG Strix RTX 4080 Super')
    expect(html).toContain('buildmyrig')
    expect(html).toContain('asus-rog-strix-rtx-4080-super')
    expect(html).toContain('Flagship 4K graphics card')
  })

  it('#623 truncates long titles/descriptions and slugifies a missing slug', () => {
    const model = serpPreviewFrom({
      title: 'A'.repeat(80),
      slug: '',
      description: 'D'.repeat(200),
    })
    expect(model.title.length).toBeLessThanOrEqual(61)
    expect(model.title).toContain('…')
    expect(model.description.length).toBeLessThanOrEqual(161)
    expect(model.url).toContain('a'.repeat(1))
  })
})

describe('BuilderRulesTabField (#624 - #625)', () => {
  it('#624 renders the validations header and degrades without a variant link', () => {
    const html = renderToStaticMarkup(<BuilderRulesTabField />)
    expect(html).toContain('bmr-builder-rules')
    expect(html).toContain('bmr-builder-rules__check')
  })

  it('#625 surfaces rule-conflict and PSU-headroom guidance sections', () => {
    const html = renderToStaticMarkup(<BuilderRulesTabField />)
    expect(html).toContain('Automated Compatibility Validations')
  })
})
