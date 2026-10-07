import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { CartDrawer, CartDrawerOverlay } from './CartDrawer'

const { mockCart } = vi.hoisted(() => ({
  mockCart: {
    cart: undefined as
      | {
          items?: {
            id?: string
            quantity?: number
            product?: { id?: number | string; title?: string } | number | string
            lineType?: string
            buildName?: string
          }[]
          subtotal?: number
        }
      | undefined,
  },
}))

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: () => mockCart,
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

/**
 * Entry 23 item 3 - CartDrawer: the store-gated wrapper renders nothing
 * while closed (zustand v5 serves the initial state during SSR); the
 * presentational overlay carries the a11y contract (role/aria) and the
 * item/subtotal/links markup.
 *
 * Note: renderToStaticMarkup cannot observe post-import store mutations
 * (zustand v5 getServerSnapshot = getInitialState), which is why the open
 * states are tested through CartDrawerOverlay props instead.
 */
describe('CartDrawer', () => {
  it('#178 closed renders nothing', () => {
    mockCart.cart = { items: [{ id: 'i1', quantity: 1, product: { id: 1, title: 'Ryzen 7' } }], subtotal: 49900 }
    expect(renderToStaticMarkup(<CartDrawer />)).toBe('')
  })

  it('#178a open renders an accessible dialog with items, subtotal and links', () => {
    const html = renderToStaticMarkup(
      <CartDrawerOverlay
        items={[
          { id: 'i1', quantity: 2, product: { id: 1, title: 'Ryzen 7 7800X3D' } },
          { id: 'i2', quantity: 1, lineType: 'configured-build', buildName: 'Falcon X' },
        ]}
        subtotal={123456}
        onClose={() => {}}
      />,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Shopping cart')
    expect(html).toContain('Your cart')
    expect(html).toContain('Ryzen 7 7800X3D')
    expect(html).toContain('Falcon X')
    expect(html).toContain('€1,234.56')
    expect(html).toContain('href="/cart"')
    expect(html).toContain('href="/checkout"')
    expect(html).toContain('Close cart')
  })

  it('#178b open with an empty cart offers browsing, no checkout link', () => {
    const html = renderToStaticMarkup(<CartDrawerOverlay items={[]} subtotal={0} onClose={() => {}} />)
    expect(html).toContain('Your cart is empty')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('href="/checkout"')
  })
})

const SRC = path.resolve(__dirname, '../..')

describe('CartDrawer wiring', () => {
  it('#178c root layout renders the drawer; add-to-cart entry points open it', () => {
    const layout = fs.readFileSync(path.join(SRC, 'src/app/(frontend)/layout.tsx'), 'utf8')
    expect(layout).toContain('<CartDrawer')

    const addBtn = fs.readFileSync(path.join(SRC, 'src/app/(frontend)/product/[slug]/AddToCartButton.tsx'), 'utf8')
    expect(addBtn).toContain('useCartDrawerStore')

    // The builder's add-to-cart → drawer wiring lives in the shared action
    // hook (extracted from SummaryClient in entry 50 P2) — that's the source
    // of truth now.
    const summary = fs.readFileSync(path.join(SRC, 'src/app/(frontend)/builder/kit/useBuildActions.ts'), 'utf8')
    expect(summary).toContain('useCartDrawerStore')
  })

  it('#178d the guided dialog animates through the shared spec module', () => {
    const landing = fs.readFileSync(path.join(SRC, 'src/app/(frontend)/builder/LandingClient.tsx'), 'utf8')
    expect(landing).toContain('dialogMotion')
    expect(landing).not.toMatch(/initial=\{\{\s*opacity:\s*0,\s*scale:\s*0\.96/)
  })
})
