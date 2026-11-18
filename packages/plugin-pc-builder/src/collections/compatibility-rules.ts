import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'
import { invalidateBuilderIndex } from '../lib/builder-index.ts'

const RULE_TYPES = ['requires', 'excludes', 'supports', 'warns'] as const
const OPERATORS = ['equals', 'in', 'gte', 'lte', 'contains'] as const
const SEVERITIES = ['error', 'warning', 'info'] as const

export const formatRuleTitle = (doc: {
  id?: unknown
  subjectType?: string | null
  type?: string | null
  targetType?: string | null
  field?: string | null
  value?: string | null
}): string => {
  const parts = [
    doc.subjectType ?? 'rule',
    doc.type ?? '',
    doc.targetType ?? '',
  ].filter(Boolean)
  const detail = doc.field ? `(${doc.field}${doc.value ? `: ${doc.value}` : ''})` : ''
  const summary = `${parts.join(' ')} ${detail}`.trim()
  return summary || (doc.id ? `Rule #${String(doc.id)}` : 'Rule')
}

export const CompatibilityRules: CollectionConfig = {
  slug: 'compatibility-rules',
  // Saved filters/columns/sort (Payload Query Presets) — the rule matrix is the
  // screen most often filtered by subject/target/severity (plan 2.1).
  enableQueryPresets: true,
  access: {
    read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data) {
          data.title = formatRuleTitle({ ...originalDoc, ...data })
        }
        return data
      },
    ],
    afterChange: [() => invalidateBuilderIndex()],
    afterDelete: [() => invalidateBuilderIndex()],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'subjectType', 'type', 'operator', 'field', 'value', 'severity', 'enabled'],
    group: 'PC Builder',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Auto-generated rule summary for admin relations and headers.',
        readOnly: true,
      },
    },
    {
      name: 'subjectType',
      type: 'select',
      options: ['component', 'category'],
      required: true,
      index: true,
    },
    {
      name: 'subjectComponent',
      type: 'relationship',
      relationTo: 'components',
      index: true,
      admin: { condition: (_, siblingData) => siblingData?.subjectType === 'component' },
    },
    {
      name: 'subjectCategory',
      type: 'relationship',
      relationTo: 'component-categories',
      index: true,
      admin: { condition: (_, siblingData) => siblingData?.subjectType === 'category' },
    },
    {
      name: 'targetType',
      type: 'select',
      options: ['component', 'category'],
      required: true,
    },
    {
      name: 'targetComponent',
      type: 'relationship',
      relationTo: 'components',
      index: true,
      admin: { condition: (_, siblingData) => siblingData?.targetType === 'component' },
    },
    {
      name: 'targetCategory',
      type: 'relationship',
      relationTo: 'component-categories',
      index: true,
      admin: { condition: (_, siblingData) => siblingData?.targetType === 'category' },
    },
    { name: 'type', type: 'select', options: [...RULE_TYPES], required: true },
    { name: 'operator', type: 'select', options: [...OPERATORS], required: true },
    { name: 'field', type: 'text', required: true, admin: { description: 'Spec key inspected on the target, e.g. socket' } },
    { name: 'value', type: 'text', required: true, admin: { description: 'JSON-encoded for in/contains' } },
    { name: 'severity', type: 'select', options: [...SEVERITIES], defaultValue: 'error' },
    { name: 'bidirectional', type: 'checkbox', defaultValue: false },
    {
      name: 'message',
      type: 'textarea',
      admin: { description: 'Tokens: {componentA} {componentB} {socketA} — any {key} uses the failing spec value' },
    },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
  ],
}
