import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AttributeTermsManager } from './AttributeTermsManager'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/collections/attribute-types/1',
}))

describe('Admin GUI — AttributeTermsManager Primitive Migration', () => {
  it('#485 AttributeTermsManager renders card container, header badge, and empty state', () => {
    const html = renderToStaticMarkup(<AttributeTermsManager />)

    expect(html).toContain('bmr-card')
    expect(html).toContain('bmr-terms-manager')
    expect(html).toContain('Configured Terms &amp; Values')
    expect(html).toContain('bmr-badge')
    expect(html).toContain('bmr-terms-form')
    expect(html).toContain('Term Value *')
    expect(html).toContain('Display Label (Optional)')
    expect(html).toContain('Add Term')
  })

  it('#486 AttributeTermsManager contains no inline style color properties', () => {
    const html = renderToStaticMarkup(<AttributeTermsManager />)

    expect(html).not.toContain('style="margin-top')
    expect(html).not.toContain('style="background:')
    expect(html).not.toContain('style="color:')
    expect(html).not.toContain('#')
  })

  it('#487 AttributeTermsManager renders primitive Input fields and Button component', () => {
    const html = renderToStaticMarkup(<AttributeTermsManager />)

    expect(html).toContain('bmr-input')
    expect(html).toContain('bmr-btn')
    expect(html).toContain('bmr-btn--primary')
  })

  it('#488 AttributeTermsManager renders tag icon and card title correctly', () => {
    const html = renderToStaticMarkup(<AttributeTermsManager />)
    expect(html).toContain('bmr-terms-manager__title')
    expect(html).toContain('Configured Terms &amp; Values')
  })
})

