import { describe, it, expect } from 'vitest'
import type { CollectionConfig } from 'payload'
import { applyListCellElevation, applyListHeaderElevation } from './admin-list-cells'

const collection = (slug: string, fields: unknown[]): CollectionConfig =>
  ({ slug, fields } as unknown as CollectionConfig)

describe('applyListCellElevation (#590 - #591)', () => {
  it('#590 assigns Entity/CodeChip/Price cells to mapped fields without touching others', () => {
    const products = collection('products', [
      { name: 'title', type: 'text' },
      { name: 'sku', type: 'text' },
      { name: 'priceInEUR', type: 'number' },
      { name: 'slug', type: 'text' },
    ])
    const users = collection('users', [{ name: 'email', type: 'email' }])

    applyListCellElevation([products, users])

    const get = (c: CollectionConfig, name: string) =>
      (c.fields as { name: string; admin?: { components?: { Cell?: string } } }[]).find(
        (f) => f.name === name,
      )

    expect(get(products, 'title')?.admin?.components?.Cell).toContain('EntityListCell')
    expect(get(products, 'sku')?.admin?.components?.Cell).toContain('CodeChipCell')
    expect(get(products, 'priceInEUR')?.admin?.components?.Cell).toContain('PriceListCell')
    // products.slug is not in the map — untouched
    expect(get(products, 'slug')?.admin).toBeUndefined()
    expect(get(users, 'email')?.admin?.components?.Cell).toContain('EntityListCell')
  })

  it('#591 recurses into tabbed fields, preserves existing admin.components and ignores unmapped collections', () => {
    const orders = collection('orders', [
      {
        type: 'tabs',
        tabs: [
          {
            name: 'pricing',
            fields: [{ name: 'total', type: 'number' }],
          },
        ],
      },
      {
        type: 'group',
        name: 'meta',
        fields: [{ name: 'internalNote', type: 'text' }],
      },
    ])
    const untouched = collection('pages', [{ name: 'title', type: 'text' }])

    applyListCellElevation([orders, untouched])

    const tabs = orders.fields[0] as unknown as {
      tabs: { fields: { name: string; admin?: { components?: { Cell?: string } } }[] }[]
    }
    expect(tabs.tabs[0].fields[0].admin?.components?.Cell).toContain('PriceListCell')

    const group = orders.fields[1] as unknown as {
      fields: { name: string; admin?: { components?: { Cell?: string } } }[]
    }
    expect(group.fields[0].admin).toBeUndefined()

    // unmapped collection untouched
    expect((untouched.fields[0] as { admin?: unknown }).admin).toBeUndefined()

    // pre-existing components on a targeted field are preserved
    const withExisting = collection('categories', [
      {
        name: 'title',
        type: 'text',
        admin: { components: { Field: './some/field#Field' } },
      },
    ])
    applyListCellElevation([withExisting])
    const titleField = withExisting.fields[0] as {
      admin?: { components?: { Cell?: string; Field?: string } }
    }
    expect(titleField.admin?.components?.Cell).toContain('EntityListCell')
    expect(titleField.admin?.components?.Field).toBe('./some/field#Field')
  })
})

describe('applyListHeaderElevation (#599 - #600)', () => {
  it('#599 appends the RegistryListHeader to beforeList on mapped collections', () => {
    const categories = collection('categories', [])
    const brands = collection('brands', [])
    applyListHeaderElevation([categories, brands])

    const beforeList = (c: CollectionConfig) =>
      (c.admin as { components?: { beforeList?: string[] } } | undefined)?.components?.beforeList
    expect(beforeList(categories)).toEqual([
      './app/(payload)/admin/components/RegistryListHeader#RegistryListHeader',
    ])
    expect(beforeList(brands)?.[0]).toContain('RegistryListHeader')
  })

  it('#600 preserves existing beforeList entries and skips collections that already carry a bespoke header', () => {
    const existing = collection('categories', [])
    existing.admin = { components: { beforeList: ['./other#Other'] } }
    const products = collection('products', [])
    const pages = collection('pages', [])

    applyListHeaderElevation([existing, products, pages])

    const beforeList = (c: CollectionConfig) =>
      (c.admin as { components?: { beforeList?: string[] } } | undefined)?.components?.beforeList
    // existing entries preserved, registry header appended
    expect(beforeList(existing)).toEqual([
      './other#Other',
      './app/(payload)/admin/components/RegistryListHeader#RegistryListHeader',
    ])
    // products already has a bespoke header — not in the registry map
    expect(beforeList(products)).toBeUndefined()
    expect(beforeList(pages)?.[0]).toContain('RegistryListHeader')
  })
})
