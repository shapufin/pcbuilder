import type { Block, Field } from 'payload'
import { sectionChildSlugs } from './slugs.ts'

/**
 * Nested container block (entry 22, Phase 5 Step D): content tab holds an
 * arbitrary stack of the other blocks (blockReferences — no recursive
 * sections, enforced server-side by filterOptions, not just the drawer),
 * layout tab holds CSS-var-driven padding/background/width.
 *
 * Unnamed content tab => its fields live at the block root (`block.blocks`);
 * named layout tab => `block.layout.*`.
 */
const nestedBlocksField: Field = {
  name: 'blocks',
  type: 'blocks',
  blocks: [],
  blockReferences: sectionChildSlugs,
  // API-level guard: config.blocks membership alone does NOT confine a blocks
  // field (payload resolves any config block), so this is what actually
  // rejects a section-inside-section or any block outside the field contract.
  filterOptions: () => sectionChildSlugs,
  admin: { initCollapsed: true },
}

const layoutFields: Field[] = [
  {
    name: 'padding',
    type: 'select',
    defaultValue: 'md',
    admin: { description: 'Vertical padding — mapped to theme spacing tokens on the storefront' },
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra large', value: 'xl' },
    ],
  },
  {
    name: 'background',
    type: 'select',
    defaultValue: 'page',
    admin: { description: 'Section background — theme surface colors' },
    options: [
      { label: 'Page', value: 'page' },
      { label: 'Alternate', value: 'alt' },
      { label: 'Raised', value: 'raised' },
    ],
  },
  {
    name: 'width',
    type: 'select',
    defaultValue: 'container',
    admin: { description: 'Inner content width' },
    options: [
      { label: 'Container (1200px)', value: 'container' },
      { label: 'Wide (1440px)', value: 'wide' },
      { label: 'Full width', value: 'full' },
    ],
  },
]

export const SectionBlock: Block = {
  slug: 'section',
  interfaceName: 'SectionBlock',
  admin: { group: 'Layout' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        { label: 'Content', fields: [nestedBlocksField] },
        { name: 'layout', label: 'Layout', fields: layoutFields },
      ],
    },
  ],
}
