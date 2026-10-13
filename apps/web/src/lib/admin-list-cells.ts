import type { CollectionConfig, Plugin } from 'payload'

const ENTITY = './app/(payload)/admin/components/EntityListCell#EntityListCell'
const CHIP = './app/(payload)/admin/components/CodeChipCell#CodeChipCell'
const PRICE = './app/(payload)/admin/components/PriceListCell#PriceListCell'
const STACK = './app/(payload)/admin/components/TaxonomyStackCell#TaxonomyStackCell'
const STOCK = './app/(payload)/admin/components/StockCell#StockCell'
const STATUS = './app/(payload)/admin/components/StatusPillCell#StatusPillCell'
const ID = './app/(payload)/admin/components/IdCell#IdCell'
const ACTIONS = './app/(payload)/admin/components/RowActionsCell#RowActionsCell'

/**
 * §5.4 table elevation map: collection slug → field name → Cell specifier.
 * Only fields that appear in `defaultColumns` (or are commonly toggled) are
 * listed; unmapped fields/collections keep Payload's default cells.
 */
const LIST_CELL_MAP: Record<string, Record<string, string>> = {
  products: {
    title: ENTITY,
    sku: CHIP,
    category: STACK,
    priceInEUR: PRICE,
    inventory: STOCK,
  },
  categories: { title: ENTITY, slug: CHIP },
  brands: { name: ENTITY, slug: CHIP },
  'discount-codes': { code: CHIP },
  reviews: { title: ENTITY, status: STATUS },
  orders: { total: PRICE, status: STATUS },
  users: { email: ENTITY },
  components: { name: ENTITY, socket: CHIP },
  'component-categories': { name: ENTITY, slug: CHIP },
  'build-templates': { name: ENTITY, basePrice: PRICE },
  'configured-builds': { name: ENTITY, priceSnapshot: PRICE },
}

/**
 * Mock-parity virtual columns + row actions are injected as `ui` fields —
 * Payload 3 has no row-action slot, and version/id pseudo-fields aren't in
 * `fields` at transform time so they can't carry a Cell override. `ui` fields
 * are valid list columns whose cells read the values straight off `rowData`.
 */
const VIRTUAL_COLUMN_FIELDS: Record<string, { name: string; label: string; cell: string }> = {
  id: { name: '_bmrId', label: 'ID', cell: ID },
  status: { name: '_bmrStatus', label: 'Status', cell: STATUS },
  actions: { name: '_bmrActions', label: 'Actions', cell: ACTIONS },
}

const LIST_ACTION_SLUGS = new Set([
  'products',
  'categories',
  'brands',
  'discount-codes',
  'reviews',
  'shipping-bands',
  'tax-rates',
  'attribute-types',
  'media',
  'pages',
])

/** Mock products-list column contract: ID | TITLE & SKU | CATEGORY & BRAND | PRICE / MARGIN | STOCK | STATUS | ACTIONS. */
const LIST_COLUMN_OVERRIDES: Record<string, string[]> = {
  products: [
    '_bmrId',
    'title',
    'category',
    'priceInEUR',
    'inventory',
    '_bmrStatus',
    '_bmrActions',
  ],
}

type LooseField = {
  name?: string
  type?: string
  label?: string
  fields?: LooseField[]
  tabs?: { fields?: LooseField[] }[]
  blocks?: { fields?: LooseField[] }[]
  admin?: { components?: Record<string, unknown> } & Record<string, unknown>
}

const walkFields = (fields: LooseField[], targets: Record<string, string>): void => {
  for (const field of fields) {
    if (field.name && targets[field.name]) {
      field.admin = {
        ...field.admin,
        components: { ...field.admin?.components, Cell: targets[field.name] },
      }
    }
    if (Array.isArray(field.fields)) walkFields(field.fields, targets)
    if (Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        if (Array.isArray(tab.fields)) walkFields(tab.fields, targets)
      }
    }
    if (Array.isArray(field.blocks)) {
      for (const block of field.blocks) {
        if (Array.isArray(block.fields)) walkFields(block.fields, targets)
      }
    }
  }
}

/**
 * Mutates the collections in-place: targeted fields gain
 * `admin.components.Cell` specifiers pointing at the elevated table cells
 * (`admin/components/{EntityListCell,CodeChipCell,PriceListCell}`).
 * Existing `admin.components` entries on targeted fields are preserved.
 */
export const applyListCellElevation = (collections: CollectionConfig[]): void => {
  for (const collection of collections) {
    const targets = LIST_CELL_MAP[collection.slug]
    if (targets) walkFields(collection.fields as LooseField[], targets)

    if (LIST_ACTION_SLUGS.has(collection.slug)) {
      const fields = (collection.fields ??= []) as LooseField[]
      const needs = [VIRTUAL_COLUMN_FIELDS.actions]
      const columns = LIST_COLUMN_OVERRIDES[collection.slug]
      if (columns?.includes(VIRTUAL_COLUMN_FIELDS.id.name)) needs.push(VIRTUAL_COLUMN_FIELDS.id)
      if (columns?.includes(VIRTUAL_COLUMN_FIELDS.status.name))
        needs.push(VIRTUAL_COLUMN_FIELDS.status)
      for (const virtual of needs) {
        if (!fields.some((f) => f.name === virtual.name)) {
          fields.push({
            name: virtual.name,
            type: 'ui',
            label: virtual.label,
            admin: { components: { Cell: virtual.cell } },
          })
        }
      }
      collection.admin ??= {}
      if (columns) {
        collection.admin.defaultColumns = columns
      } else {
        const current = Array.isArray(collection.admin.defaultColumns)
          ? collection.admin.defaultColumns
          : []
        if (!current.includes(VIRTUAL_COLUMN_FIELDS.actions.name)) {
          collection.admin.defaultColumns = [...current, VIRTUAL_COLUMN_FIELDS.actions.name]
        }
      }
    }
  }
}

const REGISTRY_HEADER = './app/(payload)/admin/components/RegistryListHeader#RegistryListHeader'

/**
 * §5.x header coverage for the remaining collections — the single
 * registry-driven `RegistryListHeader` resolves its config from the route
 * slug. Collections with bespoke headers (products, orders, components, …)
 * are intentionally absent here.
 */
const LIST_HEADER_SLUGS = [
  'categories',
  'brands',
  'discount-codes',
  'reviews',
  'shipping-bands',
  'tax-rates',
  'attribute-types',
  'media',
  'inventory-reservations',
  'pages',
  'variants',
  'transactions',
] as const

/**
 * Appends `admin.components.beforeList = […, RegistryListHeader]` on every
 * registry collection. Existing beforeList entries are preserved.
 */
export const applyListHeaderElevation = (collections: CollectionConfig[]): void => {
  for (const collection of collections) {
    if (!(LIST_HEADER_SLUGS as readonly string[]).includes(collection.slug)) continue
    collection.admin ??= {}
    const admin = collection.admin as { components?: { beforeList?: unknown } }
    const components = (admin.components ??= {})
    const before = Array.isArray(components.beforeList) ? components.beforeList : []
    if (
      (before as unknown[]).some((c) => typeof c === 'string' && c.includes('RegistryListHeader'))
    ) {
      continue
    }
    components.beforeList = [...before, REGISTRY_HEADER] as typeof components.beforeList
  }
}

/** Config-time plugin — append after shop/builder plugins so it sees final collections. */
export const listCellElevationPlugin = (): Plugin => {
  return (config) => {
    applyListCellElevation(config.collections ?? [])
    applyListHeaderElevation(config.collections ?? [])
    return config
  }
}

export { LIST_CELL_MAP, LIST_HEADER_SLUGS }
