import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Hero } from './Hero'

/**
 * Hero LCP hardening (entry 64, home-LCP watch item). The hero image is the
 * above-the-fold LCP candidate whenever an admin sets one: it must load
 * eagerly at high priority, carry intrinsic dimensions (no layout shift) and
 * use the sized `hero` variant rather than the full-size original.
 */
const media = {
  url: '/api/media/file/rig-original.png',
  alt: 'Rig hero',
  width: 4000,
  height: 2250,
  sizes: {
    hero: { url: '/api/media/file/rig-1920.png', width: 1920, height: 1080 },
  },
}

describe('Hero media', () => {
  it('#424 hero image is eager, high-priority, decoded async, with intrinsic dims', () => {
    const html = renderToStaticMarkup(
      <Hero block={{ heading: 'Build', variant: 'image', image: media }} />,
    )
    expect(html).toContain('src="/api/media/file/rig-1920.png"')
    expect(html).not.toContain('rig-original.png')
    expect(html).toContain('loading="eager"')
    // React serialises the prop as fetchPriority (HTML attrs are
    // case-insensitive; browsers read it as fetchpriority).
    expect(html).toMatch(/fetchpriority="high"/i)
    expect(html).toContain('decoding="async"')
    expect(html).toContain('width="1920"')
    expect(html).toContain('height="1080"')
  })

  it('#425 falls back to the original url and renders nothing without one', () => {
    const html = renderToStaticMarkup(
      <Hero
        block={{
          heading: 'Build',
          variant: 'image',
          image: { url: '/api/media/file/only.png', alt: 'A', width: 800, height: 600 },
        }}
      />,
    )
    expect(html).toContain('src="/api/media/file/only.png"')
    expect(html).toContain('width="800"')
    const none = renderToStaticMarkup(<Hero block={{ heading: 'Build', variant: 'image' }} />)
    expect(none).not.toContain('<img')
  })
})
