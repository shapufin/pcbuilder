'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { RotateCcw, CheckCircle2, XCircle, AlertTriangle, Activity } from 'lucide-react'
import { createRuleEngine } from '@buildmyrig/lib'
import type { BuilderIndex, ComponentSpecEntry, SelectionIssue } from '@buildmyrig/lib'

// Sandbox slots keyed by category slug — the five parts the mock's
// LIVE COMPATIBILITY ENGINE SANDBOX exercises.
const SANDBOX_SLOTS = [
  { slug: 'cpu', label: 'CPU Platform' },
  { slug: 'motherboard', label: 'Motherboard Chipset' },
  { slug: 'gpu', label: 'Graphics Card' },
  { slug: 'case', label: 'Chassis' },
  { slug: 'psu', label: 'PSU Continuous' },
] as const

export type SandboxPicks = Partial<Record<(typeof SANDBOX_SLOTS)[number]['slug'], string>>

export interface SandboxDiagnostic {
  key: string
  label: string
  status: 'pass' | 'fail' | 'warn'
  detail: string
}

export interface SandboxResult {
  diagnostics: SandboxDiagnostic[]
  errors: SelectionIssue[]
  warnings: SelectionIssue[]
  requiredWatts: number | null
}

const spec = (entry: ComponentSpecEntry | undefined, key: string): unknown =>
  entry?.specs?.[key]

/**
 * Live pipeline diagnostics — runs the REAL rule engine (`createRuleEngine`
 * from @buildmyrig/lib) over the picked components, mirroring the mock's three
 * evaluated checks plus the full `validateSelections` verdict set.
 */
export const evaluateSandbox = (index: BuilderIndex, picks: SandboxPicks): SandboxResult => {
  const bySlug = new Map(index.categories.map((c) => [c.slug, c.id]))
  const entry = (slug: string): ComponentSpecEntry | undefined => {
    const id = picks[slug as keyof SandboxPicks]
    return index.components.find((c) => c.id === id && c.categoryId === bySlug.get(slug))
  }

  const cpu = entry('cpu')
  const mobo = entry('motherboard')
  const gpu = entry('gpu')
  const kase = entry('case')
  const psu = entry('psu')

  const diagnostics: SandboxDiagnostic[] = []

  if (cpu && mobo) {
    const match = spec(cpu, 'socket') === spec(mobo, 'socket')
    diagnostics.push({
      key: 'socket',
      label: 'CPU Physical Pin / Socket Compatibility',
      status: match ? 'pass' : 'fail',
      detail: match
        ? 'PASSED (100% Match)'
        : `FAILED: ${String(spec(cpu, 'socket'))} CPU on ${String(spec(mobo, 'socket'))} board`,
    })
  } else {
    diagnostics.push({
      key: 'socket',
      label: 'CPU Physical Pin / Socket Compatibility',
      status: 'warn',
      detail: 'Select a CPU and motherboard to evaluate',
    })
  }

  if (gpu && kase) {
    const len = spec(gpu, 'gpuLengthMm')
    const max = spec(kase, 'caseGpuMaxLengthMm')
    if (typeof len === 'number' && typeof max === 'number') {
      const remaining = max - len
      diagnostics.push({
        key: 'gpu-clearance',
        label: 'GPU Physical Length vs Chassis Clearance',
        status: remaining >= 0 ? 'pass' : 'fail',
        detail:
          remaining >= 0
            ? `PASSED: ${remaining}mm remaining buffer`
            : `FAILED: ${-remaining}mm over the ${max}mm chassis limit`,
      })
    } else {
      diagnostics.push({
        key: 'gpu-clearance',
        label: 'GPU Physical Length vs Chassis Clearance',
        status: 'warn',
        detail: 'Insufficient length specs on selection',
      })
    }
  } else {
    diagnostics.push({
      key: 'gpu-clearance',
      label: 'GPU Physical Length vs Chassis Clearance',
      status: 'warn',
      detail: 'Select a GPU and chassis to evaluate',
    })
  }

  // Full selections → real engine verdicts + derived power requirement.
  const selections: Record<string, string[]> = {}
  for (const slot of SANDBOX_SLOTS) {
    const e = entry(slot.slug)
    const categoryId = bySlug.get(slot.slug)
    if (e && categoryId) selections[categoryId] = [e.id]
  }
  const engine = createRuleEngine(index)
  const { errors, warnings } = engine.validateSelections(selections)
  const requiredWatts =
    Object.keys(selections).length > 0 ? engine.recommendedPsuWatts(selections) : null

  if (psu && requiredWatts != null) {
    const watts = spec(psu, 'psuWatts')
    if (typeof watts === 'number') {
      diagnostics.push({
        key: 'psu-headroom',
        label: 'Power Supply Continuous Headroom',
        status: watts >= requiredWatts ? 'pass' : 'fail',
        detail:
          watts >= requiredWatts
            ? `PASSED: ${watts}W provides sufficient margin`
            : `FAILED: ${watts}W below the ${requiredWatts}W requirement`,
      })
    } else {
      diagnostics.push({
        key: 'psu-headroom',
        label: 'Power Supply Continuous Headroom',
        status: 'warn',
        detail: 'PSU wattage spec missing on selection',
      })
    }
  } else {
    diagnostics.push({
      key: 'psu-headroom',
      label: 'Power Supply Continuous Headroom',
      status: 'warn',
      detail: 'Select a PSU to evaluate headroom',
    })
  }

  return { diagnostics, errors, warnings, requiredWatts }
}

const firstId = (index: BuilderIndex, slug: string): string => {
  const categoryId = index.categories.find((c) => c.slug === slug)?.id
  return index.components.find((c) => c.categoryId === categoryId)?.id ?? ''
}

export interface RuleSandboxProps {
  /** Provided index (tests / embedding); fetched from /api/builder/index when absent. */
  index?: BuilderIndex
}

export const RuleSandbox: React.FC<RuleSandboxProps> = ({ index: propIndex }) => {
  const [index, setIndex] = useState<BuilderIndex | null>(propIndex ?? null)
  const [picks, setPicks] = useState<SandboxPicks>({})

  useEffect(() => {
    if (propIndex) return
    let isMounted = true
    fetch('/api/builder/index', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: BuilderIndex | null) => {
        if (isMounted && json?.components) setIndex(json)
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [propIndex])

  // Effective picks = user overrides merged over per-slot defaults — pure
  // derivation, so a stale pick (component not in the slot's category) falls
  // back to the first entry without an effect-setState pass.
  const effectivePicks = useMemo<SandboxPicks>(() => {
    if (!index) return {}
    const next: SandboxPicks = {}
    for (const slot of SANDBOX_SLOTS) {
      const picked = picks[slot.slug]
      next[slot.slug] =
        picked && entryFor(index, slot.slug, picked) ? picked : firstId(index, slot.slug)
    }
    return next
  }, [index, picks])

  const result = useMemo(
    () => (index ? evaluateSandbox(index, effectivePicks) : null),
    [index, effectivePicks],
  )

  if (!index) {
    return (
      <div className="bmr-sandbox">
        <div className="bmr-sandbox__title-row">
          <span className="bmr-sandbox__title">
            <Activity size={14} aria-hidden="true" /> LIVE COMPATIBILITY ENGINE SANDBOX
          </span>
        </div>
        <div className="bmr-sandbox__loading">Loading builder index…</div>
      </div>
    )
  }

  const reset = () => setPicks({})

  const optionsFor = (slug: string): ComponentSpecEntry[] => {
    const categoryId = index.categories.find((c) => c.slug === slug)?.id
    return index.components.filter((c) => c.categoryId === categoryId)
  }

  return (
    <div className="bmr-sandbox">
      <div className="bmr-sandbox__title-row">
        <span className="bmr-sandbox__title">
          <Activity size={14} aria-hidden="true" /> LIVE COMPATIBILITY ENGINE SANDBOX
        </span>
        <button type="button" className="bmr-sandbox__reset" onClick={reset}>
          <RotateCcw size={12} aria-hidden="true" /> Reset to Standard Spec
        </button>
      </div>

      <div className="bmr-sandbox__controls">
        {SANDBOX_SLOTS.map((slot) => {
          const options = optionsFor(slot.slug)
          const selected = entryFor(index, slot.slug, effectivePicks[slot.slug])
          return (
            <label key={slot.slug} className="bmr-sandbox__control">
              <span className="bmr-sandbox__control-label">
                {slot.label}
                {slot.slug === 'gpu' && selected?.specs.gpuLengthMm
                  ? `: ${selected.specs.gpuLengthMm}mm`
                  : ''}
                {slot.slug === 'psu' && selected?.specs.psuWatts
                  ? `: ${selected.specs.psuWatts}W`
                  : ''}
                {slot.slug === 'case' && selected?.specs.caseGpuMaxLengthMm
                  ? ` — Case max: ${selected.specs.caseGpuMaxLengthMm}mm`
                  : ''}
              </span>
              <select
                className="bmr-sandbox__select"
                value={effectivePicks[slot.slug] ?? ''}
                onChange={(e) => setPicks((prev) => ({ ...prev, [slot.slug]: e.target.value }))}
              >
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display?.name ?? c.id}
                  </option>
                ))}
              </select>
              {slot.slug === 'psu' && result?.requiredWatts != null ? (
                <span className="bmr-sandbox__req">Req: {result.requiredWatts}W</span>
              ) : null}
            </label>
          )
        })}
      </div>

      <div className="bmr-sandbox__diagnostics">
        <div className="bmr-sandbox__diag-title">EVALUATED PIPELINE DIAGNOSTICS:</div>
        {result?.diagnostics.map((d) => (
          <div key={d.key} className={`bmr-sandbox__diag bmr-sandbox__diag--${d.status}`}>
            {d.status === 'pass' ? (
              <CheckCircle2 size={13} aria-hidden="true" />
            ) : d.status === 'fail' ? (
              <XCircle size={13} aria-hidden="true" />
            ) : (
              <AlertTriangle size={13} aria-hidden="true" />
            )}
            <span className="bmr-sandbox__diag-label">{d.label}</span>
            <span className="bmr-sandbox__diag-detail">{d.detail}</span>
          </div>
        ))}
        {result?.errors.map((issue) => (
          <div key={`e-${issue.ruleId}-${issue.message}`} className="bmr-sandbox__diag bmr-sandbox__diag--fail">
            <XCircle size={13} aria-hidden="true" />
            <span className="bmr-sandbox__diag-label">Rule verdict ({issue.ruleId})</span>
            <span className="bmr-sandbox__diag-detail">{issue.message}</span>
          </div>
        ))}
        {result?.warnings.map((issue) => (
          <div key={`w-${issue.ruleId}-${issue.message}`} className="bmr-sandbox__diag bmr-sandbox__diag--warn">
            <AlertTriangle size={13} aria-hidden="true" />
            <span className="bmr-sandbox__diag-label">Advisory ({issue.ruleId})</span>
            <span className="bmr-sandbox__diag-detail">{issue.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const entryFor = (
  index: BuilderIndex,
  slug: string,
  id: string | undefined,
): ComponentSpecEntry | undefined => {
  const categoryId = index.categories.find((c) => c.slug === slug)?.id
  return index.components.find((c) => c.id === id && c.categoryId === categoryId)
}
