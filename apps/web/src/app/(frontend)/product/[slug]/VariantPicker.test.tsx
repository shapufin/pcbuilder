import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

const { VariantPicker } = await import('./VariantPicker.tsx')

/**
 * Audit round 2 (#711) — a product published without a price rendered €0.00 in
 * the buy box next to an enabled Add-to-cart button. Adding it does nothing
 * (the cart drops priceless lines), so the box has to say so instead.
 */
describe('VariantPicker price gating (#711)', () => {
  const base = {
    productId: 40,
    productTitle: 'Gaming Keyboard RGB Pro',
    variants: [] as never[],
  }

  it('#711 shows a placeholder and disables buying when there is no price', () => {
    const html = renderToStaticMarkup(
      <VariantPicker {...base} fallbackPriceCents={null} />,
    )
    expect(html).not.toContain('€0.00')
    expect(html).toContain('Price on request')
    expect(html).toMatch(/disabled/)
  })

  it('still renders a real price and an enabled button', () => {
    const html = renderToStaticMarkup(
      <VariantPicker {...base} fallbackPriceCents={12_900} />,
    )
    expect(html).toContain('€129.00')
    expect(html).not.toContain('Price on request')
  })

  it('treats a genuine zero price as a price, not as missing', () => {
    const html = renderToStaticMarkup(<VariantPicker {...base} fallbackPriceCents={0} />)
    expect(html).toContain('€0.00')
    expect(html).not.toContain('Price on request')
  })
})
