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
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'brand', 'productVariant', 'socket', 'updatedAt'],
    listSearchableFields: ['name', 'description'],
    group: 'PC Builder',
  },
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
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '60%' } },
        { name: 'category', type: 'relationship', relationTo: 'component-categories', required: true, index: true, admin: { width: '40%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'brand', type: 'relationship', relationTo: 'brands', index: true, admin: { width: '50%' } },
        {
          name: 'productVariant',
          type: 'relationship',
          relationTo: 'variants',
          unique: true,
          required: true,
          admin: { width: '50%', description: 'Price/SKU/inventory source — A1: component references a ProductVariant' },
        },
      ],
    },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'description', type: 'textarea' },
    { name: 'marketingCopy', type: 'richText' },
    {
      type: 'collapsible',
      label: 'Rule-critical specs (read by rule engine)',
      admin: { description: 'Everything in specsJson is cosmetic display/filtering only' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'socket', type: 'select', options: [...SOCKET_OPTIONS], index: true, admin: { width: '50%', description: 'CPU, motherboard — auto-compat: socket must match' } },
            { name: 'ramType', type: 'select', options: [...DDR_OPTIONS], index: true, admin: { width: '50%', description: 'RAM, motherboard — auto-compat: memory type must match' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'ramSpeedMhz', type: 'number', admin: { width: '50%', description: 'RAM speed in MHz' } },
            { name: 'ramSlots', type: 'number', min: 0, validate: (v: unknown) => v == null || Number.isInteger(v) || 'Must be a whole slot count', admin: { width: '50%', description: 'DIMM slots (motherboards) — caps RAM picks' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'tdpWatts', type: 'number', index: true, admin: { width: '50%', description: 'CPU, GPU — feeds power envelope' } },
            { name: 'psuWatts', type: 'number', admin: { width: '50%', description: 'PSU — rated wattage for power envelope' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'moboFormFactor', type: 'select', options: [...FORM_FACTOR_OPTIONS], index: true, admin: { width: '50%', description: 'Motherboard — auto-compat: must fit case' } },
            { name: 'caseSupportedFormFactors', type: 'select', hasMany: true, options: [...FORM_FACTOR_OPTIONS], admin: { width: '50%', description: 'Case — boards supported' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'gpuLengthMm', type: 'number', admin: { width: '50%', description: 'GPU clearance length (mm)' } },
            { name: 'caseGpuMaxLengthMm', type: 'number', admin: { width: '50%', description: 'Case max GPU length (mm)' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'storageInterface', type: 'select', options: [...STORAGE_INTERFACE_OPTIONS], index: true, admin: { width: '50%', description: 'Storage interface (NVMe/SATA)' } },
            { name: 'm2Slots', type: 'number', min: 0, validate: (v: unknown) => v == null || Number.isInteger(v) || 'Must be a whole slot count', admin: { width: '50%', description: 'M.2 sockets (motherboards)' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'coolerSocketSupport', type: 'select', hasMany: true, options: [...SOCKET_OPTIONS], admin: { width: '50%', description: 'Cooler sockets supported' } },
            { name: 'pcieVersion', type: 'select', options: [...PCIE_OPTIONS], admin: { width: '50%', description: 'PCIe generation' } },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Studio display (builder-design cosmetic flags)',
      admin: { description: 'Read by visual builder designs — never rule-evaluated' },
      fields: [
        { name: 'hasRgb', type: 'checkbox', defaultValue: false, admin: { description: 'RGB-capable part — lights its blueprint zone under RGB sync' } },
      ],
    },
    {
      type: 'ui',
      name: 'specFieldsForm',
      label: 'Specifications (writes into specsJson)',
      admin: {
        components: { Field: '../../../packages/plugin-pc-builder/src/admin/SpecFieldsField#SpecFieldsField' },
      },
    },
    {
      type: 'collapsible',
      label: 'Advanced (raw specsJson)',
      admin: { initCollapsed: true },
      fields: [
        { name: 'specsJson', type: 'json', admin: { description: 'Cosmetic specs; display + whitelisted filters' } },
      ],
    },
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
