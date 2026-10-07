import type { Block } from 'payload'

/**
 * Entry 71 (Nexus) — hero ported from the source app's StorefrontView:
 * eyebrow + heading with a gradient span + body + dual CTA, with the lazy
 * three.js rig visualizer as the right-hand panel (client boundary;
 * `next/dynamic` keeps three out of the entry bundle).
 */
export const NexusHeroBlock: Block = {
  slug: 'nexusHero',
  interfaceName: 'NexusHeroBlock',
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
      label: 'Buttons',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
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
