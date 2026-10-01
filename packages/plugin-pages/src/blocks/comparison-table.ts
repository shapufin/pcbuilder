import type { Block } from 'payload'

export const ComparisonTableBlock: Block = {
  slug: 'comparisonTable',
  interfaceName: 'ComparisonTableBlock',
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'columns',
      type: 'array',
      required: true,
      minRows: 2,
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    {
      name: 'rows',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'values', type: 'array', fields: [{ name: 'value', type: 'text' }] },
      ],
    },
  ],
}
