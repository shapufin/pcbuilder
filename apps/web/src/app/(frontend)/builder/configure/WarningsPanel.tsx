'use client'

import type { SelectionIssue } from '@buildmyrig/lib'

/**
 * Build-level warnings (entry 131). Callers pass `validateSelections(...).warnings`
 * for the CURRENT picks — not `result.warnings`, which is the per-CANDIDATE
 * badge dataset (a `warns` rule flags every candidate in the category, so a
 * full build printed 8 "warnings" where only 2 applied).
 *
 * Prop-driven on purpose: the panel renders both inside the BuilderProvider
 * (classic rail) and outside it (summary page, which owns its own engine).
 */
export function WarningsPanel({ warnings }: { warnings: SelectionIssue[] }) {
  if (warnings.length === 0) return null
  return (
    <div className="warnings" role="status">
      {warnings.map((w, i) => (
        <div
          key={`${w.ruleId}-${i}`}
          className={`warning-item${w.severity === 'error' ? ' warning-item--error' : ''}`}
        >
          {w.message}
        </div>
      ))}
    </div>
  )
}
