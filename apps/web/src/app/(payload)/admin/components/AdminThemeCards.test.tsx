import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminThemeCards } from './AdminThemeCards.tsx'

const { mockSetValue, mockUseField } = vi.hoisted(() => {
  const mockSetValue = vi.fn()
  const mockUseField = vi.fn(() => ({ value: 'precision-dark', setValue: mockSetValue }))
  return { mockSetValue, mockUseField }
})

vi.mock('@payloadcms/ui', () => ({ useField: mockUseField }))

describe('AdminThemeCards (#668)', () => {
  beforeEach(() => {
    mockSetValue.mockClear()
    mockUseField.mockClear()
  })

  it('binds to the adminTheme document field', () => {
    renderToStaticMarkup(<AdminThemeCards />)
    expect(mockUseField).toHaveBeenCalledWith({ path: 'adminTheme' })
  })

  it('renders every skin card with the active one marked', () => {
    const html = renderToStaticMarkup(<AdminThemeCards />)
    expect((html.match(/bmr-admin-theme-card/g) || []).length).toBeGreaterThanOrEqual(6)
    expect(html).toContain('Precision Dark')
    expect(html).toContain('Aether Foundry')
    expect(html).toContain('Classic Payload')
    expect(html).toContain('aria-pressed="true"')
  })

  it('never renders emoji in the skin labels', () => {
    const html = renderToStaticMarkup(<AdminThemeCards />)
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
  })
})
