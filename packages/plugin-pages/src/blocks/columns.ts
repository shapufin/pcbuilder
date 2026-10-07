import type { Block, Field } from 'payload'
import { columnChildSlugs } from './slugs.ts'

/**
 * Columns container block (entry 74): the missing horizontal primitive for
 * the block system — each column is an arbitrary stack of blocks
 * (`blockReferences` + `filterOptions`, server-enforced, same contract as
 * Section). Columns can't nest sections or other columns; the storefront
 * collapses to a vertical stack on mobile.
 *
 * "Columns" tab = the per-column content arrays (live at `block.columns[].blocks`);
 * "Layout" tab = `block.layout.*` closed selects — equal / wide-left /
 * wide-right split and token-mapped gap. No raw CSS from the editor.
 */
const columnBlocksField: Field = {
  name: 'blocks',
  type: 'blocks',
  label: 'Column content',
  blocks: [],
  blockReferences: columnChildSlugs,
  // API-level guard (same as Section): config.blocks membership alone does
  // NOT confine a blocks field — this rejects columns-in-columns and
  // section-in-column on direct API writes too.
  filterOptions: () => columnChildSlugs,
  admin: { initCollapsed: true },
}

const columnsArray: Field = {
  name: 'columns',
  type: 'array',
  label: 'Columns',
  minRows: 2,
  maxRows: 4,
  admin: {
    description: '2–4 columns; each column stacks any blocks. Renders as a vertical stack on mobile.',
  },
  fields: [columnBlocksField],
}

const layoutFields: Field[] = [
  {
    name: 'layout',
    type: 'select',
    defaultValue: 'equal',
    admin: {
      description:
        'Column split — wide-left/wide-right weight the edge column 2:1 (intended for 2 columns; extra columns share the remainder equally).',
    },
    options: [
      { label: 'Equal widths', value: 'equal' },
      { label: 'Wide left (2:1)', value: 'wide-left' },
      { label: 'Wide right (1:2)', value: 'wide-right' },
    ],
  },
  {
    name: 'gap',
    type: 'select',
    defaultValue: 'md',
    admin: { description: 'Column spacing — mapped to theme spacing tokens on the storefront' },
    options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ],
  },
]

export const ColumnsBlock: Block = {
  slug: 'columns',
  interfaceName: 'ColumnsBlock',
  admin: { group: 'Layout' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        { label: 'Columns', fields: [columnsArray] },
        { name: 'layout', label: 'Layout', fields: layoutFields },
      ],
    },
  ],
}
