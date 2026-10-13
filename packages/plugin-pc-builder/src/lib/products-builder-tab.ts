import type { CollectionConfig, Field, TabsField } from 'payload'

export const BUILDER_TAB_LABEL = 'Builder'
export const BUILDER_RULES_TAB_LABEL = 'Builder Rules'

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
    f.type === 'tabs' &&
    f.tabs.some(
      (t) =>
        'label' in t &&
        (t.label === BUILDER_TAB_LABEL ||
          (t.label === BUILDER_RULES_TAB_LABEL &&
            t.fields.some((tf) => 'name' in tf && tf.name === 'isComponent'))),
    )
  if (collection.fields.some(hasBuilderTab)) return collection

  const tabHasLabel = (t: { label?: unknown }, label: string): boolean =>
    'label' in t && t.label === label

  const tabsIndex = collection.fields.findIndex((f) => f.type === 'tabs')
  if (tabsIndex === -1) {
    const builderTab = { label: BUILDER_TAB_LABEL, fields: builderTabFields() }
    return { ...collection, fields: [...collection.fields, { type: 'tabs', tabs: [builderTab] }] }
  }

  const fields = [...collection.fields]
  const tabsField = fields[tabsIndex] as TabsField
  // The shop plugin may already provide a "Builder Rules" mock-parity tab —
  // fold the linkage fields into it instead of rendering a second builder tab.
  const rulesIndex = tabsField.tabs.findIndex((t) => tabHasLabel(t, BUILDER_RULES_TAB_LABEL))
  if (rulesIndex !== -1) {
    const rulesTab = tabsField.tabs[rulesIndex]
    const tabs = [...tabsField.tabs]
    tabs[rulesIndex] = { ...rulesTab, fields: [...rulesTab.fields, ...builderTabFields()] }
    fields[tabsIndex] = { ...tabsField, tabs }
    return { ...collection, fields }
  }

  const builderTab = { label: BUILDER_TAB_LABEL, fields: builderTabFields() }
  fields[tabsIndex] = { ...tabsField, tabs: [...tabsField.tabs, builderTab] }
  return { ...collection, fields }
}
