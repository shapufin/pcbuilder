import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductMarginPanel } from './ProductMarginPanel.tsx'

const { mockUseFormFields, state } = vi.hoisted(() => {
  const state = {
    priceInEUR: undefined as unknown,
    compareAtPriceInEUR: undefined as unknown,
    costInEUR: undefined as unknown,
  }
  // Payload calls the selector with `[fields]` — one object keyed by field path.
  const mockUseFormFields = vi.fn((selector: (args: unknown[]) => unknown) =>
    selector([
      {
        priceInEUR: { value: state.priceInEUR },
        compareAtPriceInEUR: { value: state.compareAtPriceInEUR },
        costInEUR: { value: state.costInEUR },
      },
    ]),
  )
  return { mockUseFormFields, state }
})

vi.mock('@payloadcms/ui', () => ({ useFormFields: mockUseFormFields }))

describe('ProductMarginPanel (#680)', () => {
  beforeEach(() => {
    state.priceInEUR = undefined
    state.compareAtPriceInEUR = undefined
    state.costInEUR = undefined
  })

  it('shows profit, margin and strike-out for a priced product', () => {
    state.priceInEUR = 129900
    state.costInEUR = 95000
    state.compareAtPriceInEUR = 159900
    const html = renderToStaticMarkup(<ProductMarginPanel />)
    expect(html).toContain('€1,299.00')
    expect(html).toContain('€950.00')
    expect(html).toContain('€349.00')
    expect(html).toContain('26.9%')
    expect(html).toContain('-18.8%')
    expect(html).toContain('LIVE')
  })

  it('warns instead of hiding a loss-making price', () => {
    state.priceInEUR = 90000
    state.costInEUR = 120000
    const html = renderToStaticMarkup(<ProductMarginPanel />)
    expect(html).toContain('LOSS')
    expect(html).toContain('Unit cost exceeds the retail price')
    expect(html).toContain('-33.3%')
  })

  it('never invents a margin when the staff-only cost is absent', () => {
    state.priceInEUR = 129900
    const html = renderToStaticMarkup(<ProductMarginPanel />)
    expect(html).toContain('NO COST')
    expect(html).toContain('Hidden')
    expect(html).toContain('No unit cost on this product')
    expect(html).not.toContain('€349.00')
    // "unknown" must never render as a real €0.00 profit
    expect(html).not.toContain('€0.00')
  })

  it('accepts string values coming from the number inputs', () => {
    state.priceInEUR = '129900'
    state.costInEUR = '95000'
    const html = renderToStaticMarkup(<ProductMarginPanel />)
    expect(html).toContain('€349.00')
  })

  it('reads the three pricing fields from the document form', () => {
    renderToStaticMarkup(<ProductMarginPanel />)
    expect(mockUseFormFields).toHaveBeenCalled()
  })
})
