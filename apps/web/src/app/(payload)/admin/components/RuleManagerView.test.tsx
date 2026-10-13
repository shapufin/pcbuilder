import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RuleManagerView, draftBody, extractApiError, type RuleRecord, type RuleDraft } from './RuleManagerView.tsx'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin/compatibility-rules-manager',
  useSearchParams: () => new URLSearchParams(),
}))

const CUSTOM_RULES: RuleRecord[] = [
  {
    id: '101',
    subjectType: 'category',
    subjectCategory: { id: 'cpu', name: 'Processors' },
    targetType: 'category',
    targetCategory: { id: 'motherboard', name: 'Motherboards' },
    type: 'requires',
    operator: 'equals',
    field: 'socket',
    value: 'TR5',
    severity: 'error',
    bidirectional: true,
    message: 'Threadripper 7000 series requires sTR5 platform.',
    enabled: true,
  },
  {
    id: '102',
    subjectType: 'component',
    subjectComponent: { id: 'gpu-1', name: 'RTX 4090 Strix' },
    targetType: 'category',
    targetCategory: { id: 'case', name: 'PC Cases' },
    type: 'requires',
    operator: 'gte',
    field: 'gpuClearanceMm',
    value: '357',
    severity: 'error',
    bidirectional: false,
    message: 'Strix 4090 requires minimum 357mm GPU clearance.',
    enabled: true,
  },
  {
    id: '103',
    subjectType: 'category',
    subjectCategory: { id: 'aio', name: 'Liquid Coolers' },
    targetType: 'category',
    targetCategory: { id: 'case', name: 'PC Cases' },
    type: 'warns',
    operator: 'equals',
    field: 'radiatorSupport360',
    value: 'true',
    severity: 'warning',
    bidirectional: false,
    message: '360mm AIO requires compatible 360mm radiator case bracket.',
    enabled: false,
  },
]

describe('RuleManagerView (#535 - #539)', () => {
  it('#535 renders 4-card telemetry ribbon with default compatibility rules', () => {
    const html = renderToStaticMarkup(<RuleManagerView />)
    expect(html).toContain('TOTAL RULES')
    expect(html).toContain('HARD CONSTRAINTS')
    expect(html).toContain('ADVISORIES &amp; RECS')
    expect(html).toContain('BIDIRECTIONAL')
    expect(html).toContain('evaluation matrix nodes')
  })

  it('#536 renders custom rules when provided via props with accurate counts and entities', () => {
    const html = renderToStaticMarkup(<RuleManagerView initialRules={CUSTOM_RULES} />)
    expect(html).toContain('Threadripper 7000')
    expect(html).toContain('RTX 4090 Strix')
    expect(html).toContain('TR5')
    expect(html).toContain('357')
    expect(html).toContain('gpuClearanceMm')
    // 3 total rules: 2 hard constraints (errors), 1 advisory (warning), 1 bidirectional
    expect(html).toContain('HARD CONSTRAINTS')
    expect(html).toContain('ADVISORIES &amp; RECS')
  })

  it('#537 renders operational rule integrity notice alert banner', () => {
    const html = renderToStaticMarkup(<RuleManagerView initialRules={CUSTOM_RULES} />)
    expect(html).toContain('Rule Engine Graph Active')
    expect(html).toContain('Bidirectional constraints are automatically mirrored')
    expect(html).toContain('View Raw Collection')
  })

  it('#538 renders high-density rule matrix table with condition chips and badges', () => {
    const html = renderToStaticMarkup(<RuleManagerView initialRules={CUSTOM_RULES} />)
    expect(html).toContain('Active')
    expect(html).toContain('Subject')
    expect(html).toContain('Condition (Operator / Field / Value)')
    expect(html).toContain('Target')
    expect(html).toContain('Severity')
    expect(html).toContain('Direction')
    expect(html).toContain('Both')
    expect(html).toContain('One-way')
    expect(html).toContain('requires')
    expect(html).toContain('warns')
  })

  it('#539 renders facet filter pills, search input, actions ribbon, and modal trigger', () => {
    const html = renderToStaticMarkup(<RuleManagerView initialRules={CUSTOM_RULES} />)
    expect(html).toContain('All Rules')
    expect(html).toContain('Requires')
    expect(html).toContain('Excludes')
    expect(html).toContain('Supports')
    expect(html).toContain('Disabled')
    expect(html).toContain('Export CSV')
    expect(html).toContain('Import CSV')
    expect(html).toContain('Add Rule')
    expect(html).toContain('Search rules by subject, field, value')
  })
})

describe('RuleManagerView write helpers (#640 - #642)', () => {
  const draft = (over: Partial<RuleDraft> = {}): RuleDraft => ({
    id: null,
    subjectType: 'category',
    subjectId: '7',
    targetType: 'category',
    targetId: '12',
    type: 'requires',
    operator: 'equals',
    field: 'socket',
    value: 'AM5',
    severity: 'error',
    bidirectional: true,
    message: '',
    ...over,
  })

  it('#640 draftBody coerces numeric-string select ids to numbers (fixes the 400)', () => {
    const body = draftBody(draft())
    expect(body.subjectCategory).toBe(7)
    expect(body.targetCategory).toBe(12)
    expect(body.subjectComponent).toBeNull()
    expect(body.targetComponent).toBeNull()
  })

  it('#641 draftBody nulls the side the subject/target type does not use', () => {
    const body = draftBody(draft({ subjectType: 'component', targetType: 'component' }))
    expect(body.subjectComponent).toBe(7)
    expect(body.targetComponent).toBe(12)
    expect(body.subjectCategory).toBeNull()
    expect(body.targetCategory).toBeNull()

    const empty = draftBody(draft({ subjectId: '', targetId: '' }))
    expect(empty.subjectComponent).toBeNull()
    expect(empty.subjectCategory).toBeNull()
    expect(empty.targetComponent).toBeNull()
    expect(empty.targetCategory).toBeNull()
  })

  it('#642 extractApiError surfaces Payload field-level validation messages', async () => {
    const res = new Response(
      JSON.stringify({
        errors: [
          {
            name: 'ValidationError',
            data: {
              collection: 'compatibility-rules',
              errors: [
                { label: 'Subject Category', message: 'invalid relationship', path: 'subjectCategory' },
              ],
            },
            message: 'The following fields are invalid: Subject Category',
          },
        ],
      }),
      { status: 400 },
    )
    await expect(extractApiError(res)).resolves.toContain('Subject Category')

    const plain = new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 })
    await expect(extractApiError(plain)).resolves.toBe('Forbidden')

    const opaque = new Response('not json', { status: 500 })
    await expect(extractApiError(opaque)).resolves.toBe('HTTP 500')
  })
})
