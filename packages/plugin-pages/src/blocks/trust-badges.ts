import type { Block } from 'payload'

export const TrustBadgesBlock: Block = {
  slug: 'trustBadges',
  interfaceName: 'TrustBadgesBlock',
  labels: {
    singular: 'Trust & Guarantees Strip',
    plural: 'Trust & Guarantees Strips',
  },
  admin: { group: 'Commerce' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow (Optional)' },
    { name: 'heading', type: 'text', label: 'Heading (Optional)' },
    {
      name: 'style',
      type: 'select',
      label: 'Card Style',
      defaultValue: 'glass',
      options: [
        { label: 'Glassmorphic Surface', value: 'glass' },
        { label: 'Solid Surface with Border', value: 'solid' },
        { label: 'Accent Border Minimal', value: 'minimal' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Trust Badges',
      minRows: 1,
      maxRows: 6,
      defaultValue: [
        { icon: 'shield-check', title: '3-Year Rig Warranty', subtitle: 'Parts & labour covered' },
        { icon: 'truck', title: '48h Priority Express', subtitle: 'Secure foam crating' },
        { icon: 'cpu', title: '100% Tested & Verified', subtitle: 'Stress-tested before shipping' },
        { icon: 'headphones', title: '24/7 Expert Support', subtitle: 'Dedicated hardware technicians' },
      ],
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'icon', type: 'text', required: true, admin: { width: '30%', description: 'e.g. shield-check, truck, cpu, headphones, zap, award' } },
            { name: 'title', type: 'text', required: true, admin: { width: '70%' } },
          ],
        },
        { name: 'subtitle', type: 'text' },
      ],
    },
  ],
}
