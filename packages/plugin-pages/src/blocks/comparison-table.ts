import type { Block } from 'payload'

export const ComparisonTableBlock: Block = {
  slug: 'comparisonTable',
  interfaceName: 'ComparisonTableBlock',
  labels: {
    singular: 'Comparison Table',
    plural: 'Comparison Tables',
  },
  admin: { group: 'Content' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'columns',
      type: 'array',
      required: true,
      minRows: 2,
      labels: {
        singular: 'Comparison Column',
        plural: 'Comparison Columns',
      },
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    {
      name: 'rows',
      type: 'array',
      labels: {
        singular: 'Feature Row',
        plural: 'Feature Rows',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'values', type: 'array', fields: [{ name: 'value', type: 'text' }] },
      ],
    },
  ],
}
