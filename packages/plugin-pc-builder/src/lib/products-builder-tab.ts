import type { CollectionConfig, Field, TabsField } from 'payload'

export const BUILDER_TAB_LABEL = 'Builder'

const builderTabFields = (): Field[] => [
  {
    name: 'isComponent',
    type: 'checkbox',
    defaultValue: false,
    admin: {
      readOnly: true,
      description: 'Set by the PC builder plugin when a component references this product',
    },
  },
  {
    name: 'component',
    type: 'relationship',
    relationTo: 'components',
    access: {
      read: ({ req }) => Boolean(req?.user),
    },
    admin: {
      readOnly: true,
      description: 'Builder component bound to this product (admin-only visibility)',
    },
  },
]

/** Injects the Builder tab (isComponent + component) into the shop products collection. */
export const withBuilderTab = (collection: CollectionConfig): CollectionConfig => {
  const hasBuilderTab = (f: Field): boolean =>
    f.type === 'tabs' && f.tabs.some((t) => 'label' in t && t.label === BUILDER_TAB_LABEL)
  if (collection.fields.some(hasBuilderTab)) return collection

  const builderTab = { label: BUILDER_TAB_LABEL, fields: builderTabFields() }
  const tabsIndex = collection.fields.findIndex((f) => f.type === 'tabs')
  if (tabsIndex === -1) {
    return { ...collection, fields: [...collection.fields, { type: 'tabs', tabs: [builderTab] }] }
  }
  const fields = [...collection.fields]
  const tabsField = fields[tabsIndex] as TabsField
  fields[tabsIndex] = { ...tabsField, tabs: [...tabsField.tabs, builderTab] }
  return { ...collection, fields }
}
