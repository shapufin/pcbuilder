import { describe, expect, it } from 'vitest'
import { mediaDoc, pickMedia } from './media'

describe('mediaDoc', () => {
  it('unwraps populated docs, rejects ids', () => {
    expect(mediaDoc({ url: '/a.png' })).toEqual({ url: '/a.png' })
    expect(mediaDoc(42)).toBeNull()
    expect(mediaDoc(null)).toBeNull()
  })
})

describe('pickMedia', () => {
  const doc = {
    alt: 'GPU render',
    url: '/media/original.png',
    width: 2000,
    height: 1200,
    sizes: { card: { url: '/media/card.png', width: 600, height: 400 } },
  }

  it('prefers the requested size with its dims and doc alt', () => {
    expect(pickMedia(doc, 'card', 'x')).toEqual({
      url: '/media/card.png',
      width: 600,
      height: 400,
      alt: 'GPU render',
    })
  })

  it('falls back to the original when the size is missing', () => {
    const pick = pickMedia({ ...doc, sizes: {} }, 'card', 'x')
    expect(pick?.url).toBe('/media/original.png')
    expect(pick?.width).toBe(2000)
  })

  it('uses configured dims when only an unknown-dims size exists', () => {
    const pick = pickMedia({ url: null, sizes: { card: { url: '/c.png' } } }, 'card', 'x')
    expect(pick).toMatchObject({ url: '/c.png', width: 600, height: 400 })
  })

  it('returns null for ids and media without any url', () => {
    expect(pickMedia(7, 'card', 'x')).toBeNull()
    expect(pickMedia({ url: null, sizes: null }, 'card', 'x')).toBeNull()
  })

  it('falls back to the supplied alt when the doc has none', () => {
    expect(pickMedia({ url: '/a.png', alt: '' }, 'card', 'Product title')?.alt).toBe('Product title')
  })
})
