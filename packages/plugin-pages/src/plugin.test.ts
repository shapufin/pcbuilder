import { describe, expect, it, vi } from 'vitest'
import type { Block, CollectionConfig, Config, Field, GlobalConfig } from 'payload'
import { pagesPlugin } from './index.ts'
import { pageBlockSlugs } from './blocks/definitions.ts'

const cfg = (collections: CollectionConfig[]): Config =>
  ({ collections, globals: [] }) as unknown as Config

const fieldNamed = (collection: CollectionConfig, name: string): (Field & { name: string; blocks?: Array<{ slug: string }>; blockReferences?: string[]; filterOptions?: unknown }) | undefined =>
  (collection.fields ?? []).find((f): f is Field & { name: string } => 'name' in f && f.name === name) as never

describe('pagesPlugin — entry 19 (Step B consolidation)', () => {
  it('#112 appends the site-settings global alongside pre-existing globals', async () => {
    const input = {
      collections: [],
      globals: [{ slug: 'pre-existing' }],
    } as unknown as Config
    const out = (await pagesPlugin()(input)) as Config
    const slugs = (out.globals ?? []).map((g) => (g as { slug: string }).slug)
    expect(slugs).toEqual(['pre-existing', 'site-settings', 'theme'])
  })

  it('#113 adds the bounded topBlocks zone (hero + ctaBanner only) to categories', async () => {
    const out = (await pagesPlugin()(cfg([{ slug: 'categories', fields: [] } as CollectionConfig]))) as Config
    const categories = (out.collections ?? []).find(
      (c) => (c as CollectionConfig).slug === 'categories',
    ) as CollectionConfig
    // entry 22: referenced by slug against config.blocks instead of inline configs
    const topBlocks = fieldNamed(categories, 'topBlocks')
    expect(topBlocks?.blocks).toEqual([])
    expect(topBlocks?.blockReferences).toEqual(['hero', 'ctaBanner'])
  })

  it('#114 renames plugin-seo meta group to seo on the pages collection', async () => {
    const out = (await pagesPlugin()(
      cfg([{ slug: 'pages', fields: [{ name: 'title', type: 'text' }] } as CollectionConfig]),
    )) as Config
    const pages = (out.collections ?? []).find((c) => (c as CollectionConfig).slug === 'pages') as CollectionConfig
    const names = (pages.fields ?? []).map((f) => ('name' in f ? f.name : ''))
    expect(names).toContain('seo')
    expect(names).not.toContain('meta')
  })

  it('#115 enabled:false skips globals/seo/topBlocks but still registers config.blocks (entry 22 re-scope)', () => {
    const input = {
      collections: [
        { slug: 'categories', fields: [] },
        { slug: 'pages', fields: [{ name: 'title', type: 'text' }] },
      ],
      globals: [{ slug: 'site-settings-old' }],
    } as unknown as Config
    const out = pagesPlugin({ enabled: false })(input) as Config
    expect(out.globals).toBe(input.globals)
    const categories = (out.collections ?? []).find(
      (c) => (c as CollectionConfig).slug === 'categories',
    ) as CollectionConfig
    expect(fieldNamed(categories, 'topBlocks')).toBeUndefined()
    // blocks stay registered: Pages layout / topBlocks reference them by slug and
    // the Lexical BlocksFeature hard-fails at boot when a slug cannot resolve.
    expect((out.blocks ?? []).map((b) => b.slug)).toEqual(pageBlockSlugs)
  })

  it('#117 warns when categories is absent (shopPlugin order/coverage guard)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      pagesPlugin()(cfg([{ slug: 'pages', fields: [] } as CollectionConfig]))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('categories'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('topBlocks'))
    } finally {
      warn.mockRestore()
    }
  })
})

/**
 * Step C (entry 21) - theme global: injected alongside site-settings, and
 * writable by managers/admins only (same rule as site-settings).
 */
describe('pagesPlugin - theme global (entry 21)', () => {
  it('#136 appends the theme global next to site-settings', () => {
    const out = pagesPlugin()(cfg([])) as Config
    const slugs = (out.globals ?? []).map((g) => (g as { slug: string }).slug)
    expect(slugs).toEqual(['site-settings', 'theme'])
  })

  it('#137 theme access: read is public, update is manager/admin only', () => {
    const out = pagesPlugin()(cfg([])) as Config
    const theme = (out.globals ?? []).find((g) => (g as { slug: string }).slug === 'theme') as GlobalConfig
    const access = theme.access as Record<string, unknown>
    const call = (fn: unknown, user: unknown): unknown =>
      (fn as (a: unknown) => unknown)({ req: { user } })

    expect(call(access.read, null)).toBe(true)
    expect(call(access.update, null)).toBe(false)
    expect(call(access.update, { roles: ['customer'] })).toBe(false)
    expect(call(access.update, { roles: ['staff'] })).toBe(false)
    expect(call(access.update, { roles: ['manager'] })).toBe(true)
    expect(call(access.update, { roles: ['admin'] })).toBe(true)
  })
})

/**
 * Step D (entry 22) - blockReferences against config.blocks: define each block
 * once at the config level, reference by slug everywhere.
 */
describe('pagesPlugin - config.blocks registration (entry 22)', () => {
  it('#149 appends every page block to config.blocks without dropping or duplicating entries', async () => {
    const preExisting = { slug: 'preExisting', fields: [] } as unknown as Block
    const input = { ...cfg([]), blocks: [preExisting] }
    const out = (await pagesPlugin()(input)) as Config
    expect((out.blocks ?? []).map((b) => b.slug)).toEqual(['preExisting', ...pageBlockSlugs])

    // running the plugin again on its own output must not duplicate slugs
    const twice = (await pagesPlugin()(out)) as Config
    const slugs = (twice.blocks ?? []).map((b) => b.slug)
    expect(slugs).toEqual(['preExisting', ...pageBlockSlugs])
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('#150 categories topBlocks: filterOptions enforces exactly hero + ctaBanner', async () => {
    const out = (await pagesPlugin()(cfg([{ slug: 'categories', fields: [] } as CollectionConfig]))) as Config
    const categories = (out.collections ?? []).find(
      (c) => (c as CollectionConfig).slug === 'categories',
    ) as CollectionConfig
    const topBlocks = fieldNamed(categories, 'topBlocks')
    expect(typeof topBlocks?.filterOptions).toBe('function')
    // server-side guard: an API caller cannot inject other config-level blocks
    // into the bounded zone just because they exist in config.blocks
    expect((topBlocks!.filterOptions as () => string[])()).toEqual(['hero', 'ctaBanner'])
  })
})
