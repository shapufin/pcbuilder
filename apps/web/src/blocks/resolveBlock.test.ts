import { describe, expect, it, vi } from 'vitest'

// The registry imports server-rendered block components; some reach the payload
// client, which vitest cannot resolve. The resolver only needs the component
// identities, so the client is stubbed.
vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('@/lib/shop', () => ({ getPayloadClient: vi.fn(), formatPrice: vi.fn() }))

import { resolveBlockComponent, PACK_OVERRIDES, LEGACY_ALIASES } from './resolveBlock.ts'
import { blockRegistry } from './registry'
import { Hero } from './components/Hero'
import { NexusHero } from '../themes/nexus/blocks/NexusHero'
import { AetherHero } from '../themes/aether/blocks/AetherHero'

describe('resolveBlockComponent (plan 3.1)', () => {
  it('#687 a shared slug renders the shared component for any pack', () => {
    expect(resolveBlockComponent('faq', 'nexus')).toBe(blockRegistry.faq)
    expect(resolveBlockComponent('faq', 'aether')).toBe(blockRegistry.faq)
    expect(resolveBlockComponent('faq', undefined)).toBe(blockRegistry.faq)
  })

  it('#688 hero is overridden per pack, so switching a theme re-renders instead of re-authoring', () => {
    expect(resolveBlockComponent('hero', 'nexus')).toBe(NexusHero)
    expect(resolveBlockComponent('hero', 'aether')).toBe(AetherHero)
    expect(resolveBlockComponent('hero', 'rig-dark')).toBe(Hero)
    expect(resolveBlockComponent('hero')).toBe(Hero)
  })

  it('#689 an unknown pack falls back to the shared component, never to nothing', () => {
    expect(resolveBlockComponent('hero', 'not-a-pack')).toBe(Hero)
    expect(resolveBlockComponent('hero', null)).toBe(Hero)
    expect(resolveBlockComponent('hero', '')).toBe(Hero)
  })

  it('#690 legacy theme slugs keep rendering exactly what they rendered before', () => {
    // content authored as nexusHero/aetherHero must not change appearance when
    // the active pack changes — these are pack-specific features, not variants
    expect(resolveBlockComponent('nexusHero', 'aether')).toBe(NexusHero)
    expect(resolveBlockComponent('nexusHero', undefined)).toBe(NexusHero)
    expect(resolveBlockComponent('aetherHero', 'nexus')).toBe(AetherHero)
    expect(resolveBlockComponent('aetherHero')).toBe(AetherHero)
  })

  it('#691 unknown or empty slugs return null so the renderer can skip them', () => {
    expect(resolveBlockComponent('doesNotExist', 'nexus')).toBeNull()
    expect(resolveBlockComponent('', 'nexus')).toBeNull()
    expect(resolveBlockComponent(undefined as unknown as string, 'nexus')).toBeNull()
  })

  it('#692 every override and alias targets a component, and overrides only use shared slugs', () => {
    for (const [pack, map] of Object.entries(PACK_OVERRIDES)) {
      for (const [slug, component] of Object.entries(map)) {
        expect(typeof component, `${pack}.${slug} is not a component`).toBe('function')
        // overrides must key on a SHARED slug, otherwise they shadow a legacy alias
        expect(LEGACY_ALIASES[slug], `${pack}.${slug} should not be a legacy slug`).toBeUndefined()
      }
    }
    for (const [slug, component] of Object.entries(LEGACY_ALIASES)) {
      expect(typeof component, `${slug} is not a component`).toBe('function')
      expect(blockRegistry[slug], `${slug} should be a registered legacy slug`).toBeDefined()
    }
  })
})
