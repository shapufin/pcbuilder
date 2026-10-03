/**
 * CSV import diff (Phase 4, 04-collections/compatibility.md): resolve → diff →
 * preview → commit. The same helper drives the preview response and the commit
 * loop so what the admin sees is exactly what will happen (no duplicate re-imports).
 */

export interface ImportRowInput {
  subjectType: 'component' | 'category'
  type: string
  operator: string
  field: string
  value: string
  targetType: 'component' | 'category'
  severity: string
  message?: string
  /** CSV round-trip columns — 'true'/'false' strings or booleans */
  bidirectional?: boolean | 'true' | 'false'
  enabled?: boolean | 'true' | 'false'
}

export interface ResolvedImportRow {
  line: number
  subjectId: string | number
  targetId: string | number
  row: ImportRowInput
}

export interface ExistingRuleKey {
  subjectType: string
  subjectId: string | number | null | undefined
  targetType: string
  targetId: string | number | null | undefined
  type: string
  operator: string
  field: string
  value: string
  severity: string
}

export type ImportAction = 'create' | 'skip' | 'error'

export interface DiffEntry {
  line: number
  action: ImportAction
  reason?: string
  subjectType: string
  targetType: string
  type: string
  operator: string
  field: string
  value: string
  severity: string
}

export interface ImportDiff {
  entries: DiffEntry[]
  summary: { create: number; skip: number; error: number }
}

/** Normalized identity of a rule row — string() so id 1 and '1' match. */
export const ruleKey = (parts: {
  subjectType: string
  subjectId: string | number | null | undefined
  targetType: string
  targetId: string | number | null | undefined
  type: string
  operator: string
  field: string
  value: string
  severity: string
}): string =>
  [
    parts.subjectType,
    String(parts.subjectId ?? ''),
    parts.targetType,
    String(parts.targetId ?? ''),
    parts.type,
    parts.operator,
    parts.field,
    parts.value,
    parts.severity,
  ].join('|')

export const diffImportRows = (
  resolved: ResolvedImportRow[],
  invalid: Array<{ line: number; reason: string }>,
  existing: ExistingRuleKey[],
): ImportDiff => {
  const existingKeys = new Set(existing.map(ruleKey))
  const entries: DiffEntry[] = []

  for (const r of resolved) {
    const key = ruleKey({
      subjectType: r.row.subjectType,
      subjectId: r.subjectId,
      targetType: r.row.targetType,
      targetId: r.targetId,
      type: r.row.type,
      operator: r.row.operator,
      field: r.row.field,
      value: r.row.value,
      severity: r.row.severity,
    })
    const identical = existingKeys.has(key)
    entries.push({
      line: r.line,
      action: identical ? 'skip' : 'create',
      ...(identical ? { reason: 'identical rule already exists' } : {}),
      subjectType: r.row.subjectType,
      targetType: r.row.targetType,
      type: r.row.type,
      operator: r.row.operator,
      field: r.row.field,
      value: r.row.value,
      severity: r.row.severity,
    })
    // Track keys created/skipped so a second identical row in the same file
    // also skips (only one create per unique rule).
    existingKeys.add(key)
  }

  for (const inv of invalid) {
    entries.push({
      line: inv.line,
      action: 'error',
      reason: inv.reason,
      subjectType: '',
      targetType: '',
      type: '',
      operator: '',
      field: '',
      value: '',
      severity: '',
    })
  }

  entries.sort((a, b) => a.line - b.line)

  const summary = {
    create: entries.filter((e) => e.action === 'create').length,
    skip: entries.filter((e) => e.action === 'skip').length,
    error: entries.filter((e) => e.action === 'error').length,
  }
  return { entries, summary }
}
