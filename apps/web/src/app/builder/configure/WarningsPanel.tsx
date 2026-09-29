'use client'

import type { EngineResult } from '@buildmyrig/lib'

interface Props {
  result: EngineResult
}

export function WarningsPanel({ result }: Props) {
  const warnings = [...result.warnings, ...result.powerWarnings]
  if (warnings.length === 0) return null
  return (
    <div className="warnings" role="status">
      {warnings.map((w, i) => (
        <div
          key={`${w.ruleId}-${w.componentIdA}-${w.componentIdB}-${i}`}
          className={`warning-item${
            w.severity === 'info' ? ' warning-item--info' : w.severity === 'error' ? ' warning-item--error' : ''
          }`}
        >
          {w.message}
        </div>
      ))}
    </div>
  )
}
