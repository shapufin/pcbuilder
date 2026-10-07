import type { CollectionConfig } from 'payload'
import { isManager, isStaff } from '../lib/access.ts'
import { invalidateBuilderIndex } from '../lib/builder-index.ts'

const RULE_TYPES = ['requires', 'excludes', 'supports', 'warns'] as const
const OPERATORS = ['equals', 'in', 'gte', 'lte', 'contains'] as const
const SEVERITIES = ['error', 'warning', 'info'] as const

export const CompatibilityRules: CollectionConfig = {
  slug: 'compatibility-rules',
  access: {
    read: ({ req }) => isStaff(req.user as { roles?: string[] | null } | null),
    create: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    update: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
    delete: ({ req }) => isManager(req.user as { roles?: string[] | null } | null),
  },
  hooks: {
    afterChange: [() => invalidateBuilderIndex()],
    afterDelete: [() => invalidateBuilderIndex()],
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['subjectType', 'type', 'operator', 'field', 'value', 'severity', 'enabled'],
    group: 'PC Builder',
  },
  fields: [
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
