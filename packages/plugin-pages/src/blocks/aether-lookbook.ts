import type { Block } from 'payload'
import { isSafeNavLinkUrl } from '../lib/site-settings.ts'

/**
 * Entry 124 (Aether) — Pre-validated rig builds showcase ported from SHOP_THEME_2.tsx:
 * Curated laboratory builds with burn-in certificate status, form-factor, and direct builder link.
 */
export const AetherLookbookBlock: Block = {
  slug: 'aetherLookbook',
  interfaceName: 'AetherLookbookBlock',
  labels: {
    singular: 'Aether Rig Lookbook',
    plural: 'Aether Rig Lookbooks',
  },
  admin: { group: 'Aether' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'PRE-VALIDATED LABORATORY RIGS' },
    { name: 'heading', type: 'text', required: true, defaultValue: 'Burn-In Certified Custom Workstations' },
    { name: 'subtitle', type: 'textarea', defaultValue: 'Fully assembled, stress-tested for 24h, and thermal-certified for production workflows.' },
    {
      name: 'rigs',
      type: 'array',
      labels: {
        singular: 'Featured Rig',
        plural: 'Featured Rigs',
      },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'tier', type: 'text', defaultValue: 'Titanium Class' },
        { name: 'summary', type: 'textarea' },
        { name: 'priceCents', type: 'number', required: true },
        { name: 'badge', type: 'text', defaultValue: '24H BURN-IN PASSED' },
        { name: 'specs', type: 'text', admin: { description: 'Short summary e.g. "RTX 5090 · 9950X3D · 64GB DDR5"' } },
        {
          name: 'url',
          type: 'text',
          defaultValue: '/builder',
          validate: (value: unknown) => {
            if (!value || typeof value !== 'string') return true
            return isSafeNavLinkUrl(value.trim()) || 'Must start with a single / (internal path) or https://'
          },
        },
      ],
    },
  ],
}
