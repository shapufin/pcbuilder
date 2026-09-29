import { describe, it, expect } from 'vitest'
import {
  diffImportRows,
  ruleKey,
  type ExistingRuleKey,
  type ResolvedImportRow,
} from './rule-import.ts'

const baseRow = {
  subjectType: 'component' as const,
  type: 'requires',
  operator: 'equals',
  field: 'socket',
  value: 'AM5',
  targetType: 'component' as const,
  severity: 'error',
}

const existing: ExistingRuleKey[] = [
  {
    subjectType: 'component',
    subjectId: 7,
    targetType: 'component',
    targetId: 9,
    type: 'requires',
    operator: 'equals',
    field: 'socket',
    value: 'AM5',
    severity: 'error',
  },
]

describe('CSV import diff (preview ↔ commit parity, entry 14)', () => {
  it('#67 identical rows skip, new rows create, unresolvable rows error with reasons', () => {
    const resolved: ResolvedImportRow[] = [
      { line: 1, subjectId: 7, targetId: 9, row: baseRow },
      {
        line: 2,
        subjectId: 7,
        targetId: 9,
        row: { ...baseRow, severity: 'warning' },
      },
      {
        line: 3,
        subjectId: 7,
        targetId: 9,
        row: { ...baseRow, field: 'ramType', value: 'DDR5' },
      },
    ]
    const invalid = [{ line: 4, reason: 'row 4: subject "Nope" not found' }]
    const diff = diffImportRows(resolved, invalid, existing)

    expect(diff.entries.map((e) => [e.line, e.action])).toEqual([
      [1, 'skip'],
      [2, 'create'],
      [3, 'create'],
      [4, 'error'],
    ])
    expect(diff.entries[0].reason).toContain('identical')
    expect(diff.entries[3].reason).toContain('not found')
    expect(diff.summary).toEqual({ create: 2, skip: 1, error: 1 })
  })

  it('#68 id normalization (number vs string) and duplicate rows within one file', () => {
    const resolved: ResolvedImportRow[] = [
      { line: 1, subjectId: '7', targetId: '9', row: baseRow },
      { line: 2, subjectId: '7', targetId: '9', row: baseRow },
      { line: 3, subjectId: 7, targetId: 9, row: { ...baseRow, value: 'LGA1700' } },
    ]
    const diff = diffImportRows(resolved, [], existing)

    expect(diff.entries.map((e) => [e.line, e.action])).toEqual([
      [1, 'skip'],
      [2, 'skip'],
      [3, 'create'],
    ])
    expect(diff.summary).toEqual({ create: 1, skip: 2, error: 0 })
  })

  it('#69 ruleKey is order-stable and string-normalizes ids', () => {
    const a = ruleKey({
      subjectType: 'component',
      subjectId: 7,
      targetType: 'category',
      targetId: '3',
      type: 'excludes',
      operator: 'in',
      field: 'formFactor',
      value: '["ITX"]',
      severity: 'warning',
    })
    const b = ruleKey({
      subjectType: 'component',
      subjectId: '7',
      targetType: 'category',
      targetId: 3,
      type: 'excludes',
      operator: 'in',
      field: 'formFactor',
      value: '["ITX"]',
      severity: 'warning',
    })
    expect(a).toBe(b)
  })
})
