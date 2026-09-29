import type { CollectionConfig } from 'payload'
import { isManager } from '../lib/access.ts'
import { clearProductsForComponent, syncComponentProductLink } from '../lib/product-sync.ts'
import { invalidateBuilderIndex } from '../lib/builder-index.ts'

const SOCKET_OPTIONS = ['AM5', 'LGA1700', 'LGA1851'] as const
const DDR_OPTIONS = ['DDR4', 'DDR5'] as const
const FORM_FACTOR_OPTIONS = ['ATX', 'mATX', 'ITX'] as const
const PCIE_OPTIONS = ['3.0', '4.0', '5.0'] as const
const STORAGE_INTERFACE_OPTIONS = ['NVMe', 'SATA'] as const

export const Components: CollectionConfig = {
  slug: 'components',
  access: {
    read: () => true,
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'category', 'brand', 'productVariant'] },
  hooks: {
    afterChange: [
      () => invalidateBuilderIndex(),
      async ({ doc, req }) => {
        // Best-effort: never block a component save on the products sync.
        try {
          await syncComponentProductLink(req.payload, doc)
        } catch (err) {
          req.payload.logger.error(`components: product link sync failed for ${String(doc.id)}: ${String(err)}`)
        }
        return doc
      },
    ],
    afterDelete: [
      () => invalidateBuilderIndex(),
      async ({ doc, req }) => {
        try {
          await clearProductsForComponent(req.payload, doc.id)
        } catch (err) {
          req.payload.logger.error(`components: product link cleanup failed for ${String(doc.id)}: ${String(err)}`)
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'productVariant',
      type: 'relationship',
      relationTo: 'variants',
      unique: true,
      required: true,
      admin: { description: 'Price/SKU/inventory source — A1: component references a ProductVariant' },
    },
    { name: 'category', type: 'relationship', relationTo: 'component-categories', required: true, index: true },
    { name: 'brand', type: 'relationship', relationTo: 'brands', index: true },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'description', type: 'textarea' },
    { name: 'marketingCopy', type: 'richText' },
    {
      type: 'collapsible',
      label: 'Rule-critical specs (read by rule engine)',
      admin: { description: 'Everything in specsJson is cosmetic display/filtering only' },
      fields: [
        { name: 'socket', type: 'select', options: [...SOCKET_OPTIONS], index: true },
        { name: 'ramType', type: 'select', options: [...DDR_OPTIONS], index: true },
        { name: 'ramSpeedMhz', type: 'number' },
        { name: 'tdpWatts', type: 'number', index: true },
        { name: 'psuWatts', type: 'number' },
        { name: 'moboFormFactor', type: 'select', options: [...FORM_FACTOR_OPTIONS], index: true },
        { name: 'caseSupportedFormFactors', type: 'select', hasMany: true, options: [...FORM_FACTOR_OPTIONS] },
        { name: 'gpuLengthMm', type: 'number' },
        { name: 'caseGpuMaxLengthMm', type: 'number' },
        { name: 'coolerSocketSupport', type: 'select', hasMany: true, options: [...SOCKET_OPTIONS] },
        { name: 'storageInterface', type: 'select', options: [...STORAGE_INTERFACE_OPTIONS], index: true },
        { name: 'pcieVersion', type: 'select', options: [...PCIE_OPTIONS] },
      ],
    },
    { name: 'specsJson', type: 'json', admin: { description: 'Cosmetic specs; display + whitelisted filters' } },
    { name: 'compatTags', type: 'array', fields: [{ name: 'tag', type: 'text', required: true }] },
    { name: 'isOsLicense', type: 'checkbox', defaultValue: false, admin: { description: 'OS slot special-casing' } },
    {
      type: 'ui',
      name: 'conflictsPreview',
      label: 'Live conflicts',
      admin: { components: { Field: '../../../packages/plugin-pc-builder/src/admin/ConflictsField#ConflictsField' } },
    },
  ],
}
