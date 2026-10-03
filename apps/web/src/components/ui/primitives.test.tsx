import { describe, expect, it, vi } from 'vitest'
import Link from 'next/link'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from './Button'
import { Price, formatEUR } from './Price'
import { Badge, statusVariant } from './Badge'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'
import { Field } from './Field'

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
 * Phase-0 redesign primitives: the shared building blocks that replace
 * per-page ad-hoc inline styles. Rendered to static markup so both server
 * and client usage is covered.
 */
describe('Button', () => {
  it('#287 renders a primary <button> by default', () => {
    const html = renderToStaticMarkup(<Button>Add to cart</Button>)
    expect(html).toContain('<button')
    expect(html).toContain('class="btn"')
    expect(html).toContain('Add to cart')
  })

  it('#287a renders a real <a> when href is set (navigation keeps Cmd+click)', () => {
    const html = renderToStaticMarkup(<Button href="/shop">Browse</Button>)
    expect(html).toContain('<a')
    expect(html).toContain('href="/shop"')
  })

  it('#287b applies variant + size modifiers and disables while loading', () => {
    const html = renderToStaticMarkup(
      <Button variant="danger" size="sm" loading>
        Removing
      </Button>,
    )
    expect(html).toContain('btn--danger')
    expect(html).toContain('btn--sm')
    expect(html).toContain('btn--loading')
    expect(html).toContain('disabled')
    expect(html).toContain('btn__spinner')
    expect(html).toContain('aria-busy="true"')
  })
})

describe('Price', () => {
  it('#287c formats cents as EUR with tabular-nums class', () => {
    const html = renderToStaticMarkup(<Price cents={123456} />)
    expect(html).toContain('price')
    expect(formatEUR(123456)).toBe('€1,234.56')
  })
})

describe('Badge', () => {
  it('#287d renders variant classes so status is not color-only', () => {
    expect(renderToStaticMarkup(<Badge variant="success">completed</Badge>)).toContain('badge--success')
    expect(renderToStaticMarkup(<Badge>pending</Badge>)).not.toContain('badge--')
  })

  it('#287e statusVariant maps order statuses', () => {
    expect(statusVariant('completed')).toBe('success')
    expect(statusVariant('processing')).toBe('warning')
    expect(statusVariant('cancelled')).toBe('danger')
    expect(statusVariant('pending')).toBe('muted')
    expect(statusVariant(undefined)).toBe('muted')
  })
})

describe('EmptyState', () => {
  it('#287f renders title, description and an action', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Cart is empty" description="Add something first." action={<Link href="/shop">Shop</Link>} />,
    )
    expect(html).toContain('empty-state')
    expect(html).toContain('Cart is empty')
    expect(html).toContain('Add something first.')
    expect(html).toContain('Shop')
  })
})

describe('Skeleton', () => {
  it('#287g renders a hidden-from-AT block with the given dimensions', () => {
    const html = renderToStaticMarkup(<Skeleton width={120} height={24} />)
    expect(html).toContain('skeleton')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('width:120px')
    expect(html).toContain('height:24px')
  })
})

describe('Field', () => {
  it('#287h wires label + control + inline error', () => {
    const html = renderToStaticMarkup(
      <Field label="Email" htmlFor="f-email" error="Required" required>
        <input id="f-email" />
      </Field>,
    )
    expect(html).toContain('for="f-email"')
    expect(html).toContain('field__error')
    expect(html).toContain('role="alert"')
    expect(html).toContain('*')
  })
})
