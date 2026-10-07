import type { Block } from 'payload'

/**
 * Entry 71 (Nexus) — product rail with nexus styling: spec chips read from
 * product specsJson (spec-meta helper), optional `prebuilt-tier` attribute
 * chips for pre-built rigs.
 */
export const NexusProductRailBlock: Block = {
  slug: 'nexusProductRail',
  interfaceName: 'NexusProductRailBlock',
  admin: { group: 'Nexus' },
  fields: [
    { name: 'eyebrow', type: 'text', maxLength: 120 },
    { name: 'heading', type: 'text', required: true },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: { description: 'Products are drawn from this category; empty = latest published.' },
    },
    {
      name: 'limit',
      type: 'number',
      min: 1,
      max: 12,
      defaultValue: 6,
    },
    {
      name: 'showTierChips',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Show the prebuilt-tier attribute as a chip on each card.' },
    },
  ],
}
