import type { Block } from 'payload'

/**
 * Entry 124 (Aether) — Hardware category & telemetry matrix ported from SHOP_THEME_2.tsx:
 * Department cards with active restock telemetry and direct filter navigation.
 */
export const AetherTelemetryGridBlock: Block = {
  slug: 'aetherTelemetryGrid',
  interfaceName: 'AetherTelemetryGridBlock',
  labels: {
    singular: 'Aether Telemetry Grid',
    plural: 'Aether Telemetry Grids',
  },
  admin: { group: 'Aether' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'HARDWARE DEPARTMENTS' },
    { name: 'heading', type: 'text', required: true, defaultValue: 'Engineered Components Catalog' },
    { name: 'subtitle', type: 'textarea', defaultValue: 'Filter high-compute parts by thermal dissipation, silicon binning score, and form factor.' },
    {
      name: 'departments',
      type: 'array',
      labels: {
        singular: 'Department',
        plural: 'Departments',
      },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'code', type: 'text', required: true, admin: { description: 'Short lab code e.g. "GPU-01"' } },
        { name: 'description', type: 'text' },
        { name: 'telemetry', type: 'text', admin: { description: 'Live status e.g. "450W TDP Validated"' } },
        { name: 'categorySlug', type: 'text', required: true },
      ],
    },
  ],
}
