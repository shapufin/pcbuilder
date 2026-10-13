import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BannerCountdown } from './BannerCountdown'

describe('BannerCountdown Block Component', () => {
  it('renders heading, badge, subheading and CTA link', () => {
    const html = renderToStaticMarkup(
      <BannerCountdown
        block={{
          heading: 'Black Friday Rig Sale',
          badgeText: 'HOT DEAL',
          subheading: 'Get up to 20% off high-end custom configs.',
          ctaLabel: 'Shop Deals',
          ctaUrl: '/shop',
          variant: 'cyber-neon',
        }}
      />,
    )

    expect(html).toContain('Black Friday Rig Sale')
    expect(html).toContain('HOT DEAL')
    expect(html).toContain('Get up to 20% off')
    expect(html).toContain('Shop Deals')
    expect(html).toContain('href="/shop"')
    expect(html).toContain('data-variant="cyber-neon"')
  })
})
