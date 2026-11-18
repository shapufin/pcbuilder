import type { Block } from 'payload'
import { isSafeNavLinkUrl } from '../lib/site-settings.ts'

/**
 * Entry 71 (Nexus) — hero ported from the source app's StorefrontView:
 * eyebrow + heading with a gradient span + body + dual CTA, with the lazy
 * three.js rig visualizer as the right-hand panel (client boundary;
 * `next/dynamic` keeps three out of the entry bundle).
 */
export const NexusHeroBlock: Block = {
  slug: 'nexusHero',
  interfaceName: 'NexusHeroBlock',
  labels: {
    singular: 'Nexus Hero Section',
    plural: 'Nexus Hero Sections',
  },
  admin: { group: 'Nexus' },
  fields: [
    { name: 'eyebrow', type: 'text', maxLength: 120 },
    { name: 'heading', type: 'text', required: true },
    {
      name: 'gradientText',
      type: 'text',
      admin: { description: 'Word(s) inside the heading rendered in the gradient accent.' },
    },
    { name: 'body', type: 'textarea' },
    {
      name: 'ctas',
      type: 'array',
      labels: {
        singular: 'CTA Button',
        plural: 'CTA Buttons',
      },
      admin: { initCollapsed: true },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: (value: unknown) => {
            if (typeof value !== 'string' || !value.trim()) return 'URL is required'
            return isSafeNavLinkUrl(value.trim()) || 'Must start with a single / (internal path) or https://'
          },
        },
        { name: 'style', type: 'select', options: ['primary', 'ghost'], defaultValue: 'primary' },
      ],
    },
    {
      name: 'showRigVisualizer',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Lazy-loaded 3D rig (three.js). Uncheck for a copy-only hero.' },
    },
    { name: 'hint', type: 'text', admin: { description: 'Small caption under the CTAs.' } },
  ],
}
