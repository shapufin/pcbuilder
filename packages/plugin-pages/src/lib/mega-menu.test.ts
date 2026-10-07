import { describe, expect, it } from 'vitest'
import { DEFAULT_MEGA_MENU, MEGA_MENU_ICONS, resolveMegaMenu } from './mega-menu'

/**
 * Entry 71 (Nexus) — mega-menu global resolver. Same contract as
 * resolveSiteSettings: pure, accepts unknown, never throws; unsafe URLs and
 * unknown icons are dropped even though only managers can write the global.
 */
describe('mega menu resolver', () => {
  it('#439 no doc / missing sections -> DEFAULT_MEGA_MENU', () => {
    expect(resolveMegaMenu(null)).toEqual(DEFAULT_MEGA_MENU)
    expect(resolveMegaMenu(undefined)).toEqual(DEFAULT_MEGA_MENU)
    expect(resolveMegaMenu({})).toEqual(DEFAULT_MEGA_MENU)
    expect(DEFAULT_MEGA_MENU.sections.length).toBeGreaterThan(0)
    // Defaults must themselves resolve clean (no dropped items).
    const round = resolveMegaMenu({ sections: DEFAULT_MEGA_MENU.sections })
    expect(round.sections).toHaveLength(DEFAULT_MEGA_MENU.sections.length)
    expect(round.sections[0]!.items).toHaveLength(DEFAULT_MEGA_MENU.sections[0]!.items.length)
  })

  it('#440 empty sections array is a deliberate "hide flyout" choice', () => {
    expect(resolveMegaMenu({ sections: [] }).sections).toEqual([])
  })

  it('#441 hostile items/urls/icons dropped, valid kept; trims + truncation', () => {
    const resolved = resolveMegaMenu({
      sections: [
        {
          title: '  Components  ',
          description: 'x'.repeat(500),
          url: 'javascript:alert(1)',
          items: [
            { label: 'GPU', subtitle: 'Cards', url: '/shop/gpus', badge: 'Hot', icon: 'speed' },
            { label: 'XSS', url: '//evil.example.com' },
            { label: 'Backslash', url: '/\\evil.com' },
            { label: '', url: '/no-label' },
            { label: 'No URL' },
            { label: 'Bad icon', url: '/shop', icon: '<script>' },
            'junk',
            null,
          ],
        },
        { title: '' }, // dropped — no title
      ],
    })
    expect(resolved.sections).toHaveLength(1)
    const s = resolved.sections[0]!
    expect(s.title).toBe('Components')
    expect(s.description).toHaveLength(200)
    expect(s.url).toBe('/shop') // hostile url → default
    expect(s.items).toHaveLength(2)
    expect(s.items[0]).toEqual({
      label: 'GPU',
      subtitle: 'Cards',
      url: '/shop/gpus',
      badge: 'Hot',
      icon: 'speed',
    })
    expect(s.items[1]!.icon).toBeUndefined()
  })

  it('#442 featured promo: requires title+url; media doc -> imageUrl; unknown icon select stays closed', () => {
    const resolved = resolveMegaMenu({
      sections: [
        {
          title: 'S',
          featuredPromo: {
            title: 'Promo',
            url: '/shop',
            buttonText: 'Go',
            image: { url: '/media/promo.jpg' },
          },
        },
        {
          title: 'T',
          featuredPromo: { title: 'No url promo' }, // dropped
        },
        {
          title: 'U',
          featuredPromo: { title: 'P', url: '/x', image: 123 }, // unpopulated id
        },
      ],
    })
    expect(resolved.sections[0]!.featuredPromo?.imageUrl).toBe('/media/promo.jpg')
    expect(resolved.sections[0]!.featuredPromo?.buttonText).toBe('Go')
    expect(resolved.sections[1]!.featuredPromo).toBeUndefined()
    expect(resolved.sections[2]!.featuredPromo?.imageUrl).toBe('')
    for (const icon of MEGA_MENU_ICONS) {
      const r = resolveMegaMenu({
        sections: [{ title: 'S', items: [{ label: 'L', url: '/x', icon }] }],
      })
      expect(r.sections[0]!.items[0]!.icon).toBe(icon)
    }
  })
})
