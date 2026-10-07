import type { Block } from 'payload'

/**
 * Entry 71 (Nexus) — the animated motherboard slot explorer (canvas
 * particles + SVG mounting). Default content: first published product per
 * mapped category; admins may override a slot with a specific product.
 * Slot interactions navigate to /shop/[slug] or /product/[slug] — adding to
 * cart stays on the PDP/builder (variant resolution lives there).
 */
export const NexusSlotExplorerBlock: Block = {
  slug: 'nexusSlotExplorer',
  interfaceName: 'NexusSlotExplorerBlock',
  admin: { group: 'Nexus' },
  fields: [
    { name: 'eyebrow', type: 'text', maxLength: 120 },
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    {
      name: 'slots',
      type: 'array',
      label: 'Slot product overrides',
      admin: { description: 'Optional — leave empty to use the first published product per slot category.' },
      fields: [
        {
          name: 'slot',
          type: 'select',
          required: true,
          options: ['gpu', 'cpu', 'cooling', 'ram', 'storage', 'power', 'case', 'motherboard'],
        },
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
      ],
    },
  ],
}
