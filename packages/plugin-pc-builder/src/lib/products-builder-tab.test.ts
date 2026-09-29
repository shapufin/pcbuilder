import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'
import { withBuilderTab, BUILDER_TAB_LABEL } from './products-builder-tab.ts'

const baseProducts = (): CollectionConfig => ({
  slug: 'products',
  fields: [
    {
      type: 'tabs',
      tabs: [
        { label: 'Catalog', fields: [{ name: 'title', type: 'text' }] },
        { label: 'Commerce', fields: [{ name: 'slug', type: 'text' }] },
      ],
    },
  ],
})

const builderTabOf = (c: CollectionConfig): { label: string; fields: Field[] } | undefined => {
  const tabsField = c.fields.find((f) => f.type === 'tabs')
  if (!tabsField || tabsField.type !== 'tabs') return undefined
  return tabsField.tabs.find((t) => 'label' in t && t.label === BUILDER_TAB_LABEL) as
    | { label: string; fields: Field[] }
    | undefined
}

describe('withBuilderTab', () => {
  it('appends the Builder tab to the existing tabs field', () => {
    const out = withBuilderTab(baseProducts())
    const tabsField = out.fields.find((f) => f.type === 'tabs')
    expect(tabsField?.type).toBe('tabs')
    if (tabsField?.type !== 'tabs') throw new Error('unreachable')
    expect(tabsField.tabs.map((t) => ('label' in t ? t.label : ''))).toEqual([
      'Catalog',
      'Commerce',
      BUILDER_TAB_LABEL,
    ])
  })

  it('creates a new tabs field when the collection has none', () => {
    const out = withBuilderTab({ slug: 'products', fields: [{ name: 'title', type: 'text' }] })
    expect(out.fields).toHaveLength(2)
    expect(builderTabOf(out)).toBeDefined()
  })

  it('Builder tab carries readOnly isComponent + admin-only component relationship', () => {
    const tab = builderTabOf(withBuilderTab(baseProducts()))
    if (!tab) throw new Error('no builder tab')
    const isComponent = tab.fields.find((f) => 'name' in f && f.name === 'isComponent')
    const component = tab.fields.find((f) => 'name' in f && f.name === 'component')
    if (!isComponent || !('admin' in isComponent) || !component || !('access' in component)) {
      throw new Error('missing fields')
    }
    expect(isComponent.type).toBe('checkbox')
    expect((isComponent.admin as { readOnly?: boolean } | undefined)?.readOnly).toBe(true)
    expect(component.type).toBe('relationship')
    expect((component as { relationTo?: unknown }).relationTo).toBe('components')
    const read = component.access?.read
    expect(typeof read).toBe('function')
    if (typeof read === 'function') {
      expect(read({ req: { user: null } } as never)).toBe(false)
      expect(read({ req: { user: { id: 'u1' } } } as never)).toBe(true)
    }
  })

  it('is idempotent — calling twice does not duplicate the tab', () => {
    const once = withBuilderTab(baseProducts())
    const twice = withBuilderTab(once)
    const tabsField = twice.fields.find((f) => f.type === 'tabs')
    if (tabsField?.type !== 'tabs') throw new Error('unreachable')
    expect(tabsField.tabs.filter((t) => 'label' in t && t.label === BUILDER_TAB_LABEL)).toHaveLength(1)
  })
})
