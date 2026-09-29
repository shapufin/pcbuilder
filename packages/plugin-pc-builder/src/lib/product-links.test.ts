import { describe, expect, it } from 'vitest'
import { productLinkFor, clearComponentLink } from './product-links.ts'

describe('productLinkFor', () => {
  it('resolves the product id from a populated variant', () => {
    expect(
      productLinkFor({ id: 'c1', productVariant: { id: 'v1', product: { id: 'p1' } } }),
    ).toBe('p1')
  })

  it('resolves when variant.product is a plain id', () => {
    expect(productLinkFor({ id: 'c1', productVariant: { id: 'v1', product: 42 } })).toBe('42')
  })

  it('returns null for an id-only variant (caller must refetch with depth)', () => {
    expect(productLinkFor({ id: 'c1', productVariant: 'v1' })).toBeNull()
    expect(productLinkFor({ id: 'c1', productVariant: 7 })).toBeNull()
  })

  it('returns null when variant or product is missing', () => {
    expect(productLinkFor({ id: 'c1' })).toBeNull()
    expect(productLinkFor({ id: 'c1', productVariant: null })).toBeNull()
    expect(productLinkFor({ id: 'c1', productVariant: { id: 'v1', product: null } })).toBeNull()
    expect(productLinkFor({ id: 'c1', productVariant: { id: 'v1' } })).toBeNull()
    expect(productLinkFor(undefined)).toBeNull()
  })
})

describe('clearComponentLink', () => {
  it('unlinks a product from the builder', () => {
    expect(clearComponentLink()).toEqual({ isComponent: false, component: null })
  })
})
