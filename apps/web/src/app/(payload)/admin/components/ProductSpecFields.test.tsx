import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductSpecFields } from './ProductSpecFields'

// Mock @payloadcms/ui hooks
vi.mock('@payloadcms/ui', () => ({
  useForm: () => ({
    dispatchFields: vi.fn(),
  }),
  useFormFields: () => [
    { value: '{"socket":"AM5","tdp":105}' }, // specsJson
    { value: 1 }, // category
    { value: 2 }, // component
  ],
}))

describe('Admin GUI — ProductSpecFields Primitive Migration', () => {
  it('#489 ProductSpecFields renders card container, title, and badge', () => {
    const html = renderToStaticMarkup(<ProductSpecFields />)

    expect(html).toContain('bmr-card')
    expect(html).toContain('bmr-spec-fields')
    expect(html).toContain('Category Specifications Template')
    expect(html).toContain('bmr-badge')
  })

  it('#490 ProductSpecFields renders template selector and footer helper notice', () => {
    const html = renderToStaticMarkup(<ProductSpecFields />)

    expect(html).toContain('bmr-spec-fields__template-select')
    expect(html).toContain('CPU (Processor)')
    expect(html).toContain('GPU (Graphics Card)')
    expect(html).toContain('bmr-spec-fields__footer-note')
    expect(html).toContain('Values saved here write directly into the product')
  })

  it('#491 ProductSpecFields contains no inline style color properties', () => {
    const html = renderToStaticMarkup(<ProductSpecFields />)

    expect(html).not.toContain('style="margin:')
    expect(html).not.toContain('style="background:')
    expect(html).not.toContain('style="color:')
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/)
  })
})
