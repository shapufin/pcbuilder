import { describe, expect, it } from 'vitest'
import { CompatibilityRules, formatRuleTitle } from './compatibility-rules.ts'

describe('CompatibilityRules collection configuration', () => {
  it('uses "title" as admin title', () => {
    expect(CompatibilityRules.admin?.useAsTitle).toBe('title')
  })

  it('formatRuleTitle generates readable composite summary', () => {
    const summary = formatRuleTitle({
      subjectType: 'component',
      type: 'requires',
      targetType: 'category',
      field: 'socket',
      value: 'AM5',
    })
    expect(summary).toBe('component requires category (socket: AM5)')
  })

  it('beforeChange populates data.title', () => {
    const beforeChangeHook = CompatibilityRules.hooks?.beforeChange?.[0]
    expect(beforeChangeHook).toBeDefined()

    const result = (beforeChangeHook as any)({
      data: {
        subjectType: 'component',
        type: 'excludes',
        targetType: 'component',
        field: 'tdp',
      },
      originalDoc: {},
    })

    expect(result.title).toBe('component excludes component (tdp)')
  })
})

describe('query presets on compatibility rules (plan 2.1)', () => {
  it('#686 rules ship query presets', () => {
    expect(CompatibilityRules.enableQueryPresets).toBe(true)
  })
})
