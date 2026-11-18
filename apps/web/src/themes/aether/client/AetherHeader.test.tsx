import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AetherHeaderClient } from './AetherHeaderClient'
import { AetherSearchModal } from './AetherSearchModal'

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: () => ({ cart: { items: [], subtotal: 0 } }),
  useEcommerce: () => ({ user: null }),
}))

vi.mock('next/link', async () => {
  const { jsx } = await import('react/jsx-runtime')
  return {
    default: ({
      href,
      children,
      ...rest
    }: {
      href: string
      children?: React.ReactNode
      [key: string]: unknown
    }) => jsx('a', { href, ...rest, children }),
  }
})

describe('AetherHeader & AetherSearchModal', () => {
  it('#725 AetherHeaderClient renders luxury chrome with ae-* tokens and accessible navigation', () => {
    const html = renderToStaticMarkup(
      <AetherHeaderClient
        navLinks={[
          { label: 'Shop', url: '/shop' },
          { label: 'Builder', url: '/builder' },
        ]}
        announcements={['TEST TELEMETRY TICKER']}
        megaMenu={[]}
      />,
    )
    expect(html).toContain('ae-ticker')
    expect(html).toContain('TEST TELEMETRY TICKER')
    expect(html).toContain('ae-brand')
    expect(html).toContain('AETHER // RIGS')
    expect(html).toContain('ae-nav')
    expect(html).toContain('ae-search-trigger')
    expect(html).toContain('ae-cart-btn')
    expect(html).not.toContain('hidden items-center gap-4 text-xs md:flex')
  })

  it('#726 AetherSearchModal renders accessible dialog using ae-* design system classes', () => {
    const html = renderToStaticMarkup(
      <AetherSearchModal isOpen={true} onClose={() => {}} />,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('class="ae-modal-backdrop"')
    expect(html).toContain('class="ae-search-modal"')
    expect(html).toContain('class="ae-search-modal__bar"')
    expect(html).toContain('class="ae-search-modal__input"')
    expect(html).not.toContain('fixed inset-0 z-50 flex items-start')
  })
})
