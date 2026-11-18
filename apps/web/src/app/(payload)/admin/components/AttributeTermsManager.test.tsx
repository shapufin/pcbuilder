import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AttributeTermsManager,
  checkTermVariantUsage,
  deleteTermWithGuard,
} from './AttributeTermsManager'

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

  it('#489 checkTermVariantUsage returns referencing variant count from API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ totalDocs: 3 }),
    })

    const count = await checkTermVariantUsage(42, mockFetch as unknown as typeof fetch)
    expect(count).toBe(3)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/variants?where[options.value][equals]=42&limit=1&depth=0',
    )
  })

  it('#490 deleteTermWithGuard blocks deletion when active variants reference term', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/variants')) {
        return { ok: true, json: async () => ({ totalDocs: 2 }) }
      }
      return { ok: true }
    })

    const result = await deleteTermWithGuard(
      { id: 42, value: 'AM5' },
      mockFetch as unknown as typeof fetch,
    )

    expect(result.allowed).toBe(false)
    expect(result.variantCount).toBe(2)
    // DELETE must NOT be called
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/attribute-values/42',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('#491 deleteTermWithGuard executes DELETE when 0 variants reference term', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/variants')) {
        return { ok: true, json: async () => ({ totalDocs: 0 }) }
      }
      return { ok: true }
    })

    const result = await deleteTermWithGuard(
      { id: 42, value: 'AM5' },
      mockFetch as unknown as typeof fetch,
    )

    expect(result.allowed).toBe(true)
    expect(result.variantCount).toBe(0)
    expect(mockFetch).toHaveBeenCalledWith('/api/attribute-values/42', {
      method: 'DELETE',
    })
  })
})

