import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TrustBadges } from './TrustBadges'

describe('TrustBadges Block Component', () => {
  it('renders badges with icons, titles, and subtitles', () => {
    const html = renderToStaticMarkup(
      <TrustBadges
        block={{
          heading: 'Our Guarantee',
          style: 'glass',
          items: [
            { icon: 'shield-check', title: '3-Year Warranty', subtitle: 'Full coverage' },
            { icon: 'truck', title: 'Express Delivery', subtitle: '48h dispatch' },
          ],
        }}
      />,
    )

    expect(html).toContain('Our Guarantee')
    expect(html).toContain('3-Year Warranty')
    expect(html).toContain('Full coverage')
    expect(html).toContain('Express Delivery')
    expect(html).toContain('data-style="glass"')
  })

  it('renders nothing when items are empty', () => {
    const html = renderToStaticMarkup(<TrustBadges block={{ items: [] }} />)
    expect(html).toBe('')
  })
})
