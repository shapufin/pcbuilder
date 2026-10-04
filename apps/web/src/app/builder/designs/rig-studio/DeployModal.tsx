'use client'

import { useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Play,
  RotateCw,
  ShieldCheck,
} from 'lucide-react'
import { resolvedMax } from '@buildmyrig/lib'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { buildManifest } from '../../kit/build-io'
import { copyText } from '../../kit/clipboard'
import { checkCompatibility, checkPowerEnvelope } from '../../kit/deploy-checks'
import type { BuilderToast } from '../../kit/BuilderToasts'
import { StudioModalShell } from './StudioModalShell'
import { psuRatedWatts } from './studio-lib'

type ToastFn = (message: string, kind?: BuilderToast['kind']) => void

type StageStatus = 'queued' | 'running' | 'passed' | 'failed'
interface Stage {
  title: string
  detail: string
  status: StageStatus
  lines: string[]
}

type Phase = 'idle' | 'running' | 'done' | 'failed'

const freshStages = (): Stage[] => [
  { title: '1. Compatibility matrix', detail: 'Required slots + rule-engine validation', status: 'queued', lines: [] },
  { title: '2. Power envelope', detail: 'Estimated draw vs rated PSU wattage', status: 'queued', lines: [] },
  { title: '3. Manifest registration', detail: 'Persist draft build + share token', status: 'queued', lines: [] },
  { title: '4. Dispatch', detail: 'Composite line → cart → drawer', status: 'queued', lines: [] },
]

const STAGE_MIN_MS = 600
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const minDelay = async <T,>(ms: number, op: Promise<T>): Promise<T> => {
  const [result] = await Promise.all([op, delay(ms)])
  return result
}

const STATUS_LABEL: Record<StageStatus, string> = {
  queued: 'Queued',
  running: 'Testing…',
  passed: 'Passed',
  failed: 'Failed',
}

/**
 * Deploy pipeline (entry 50 P4, plan §6.4): staged validation bound to REAL
 * ops — engine validateSelections, derived-power verdict, draft save,
 * add-build→cart. A stage that fails halts the pipeline with its reasons;
 * nothing reaches the cart on an incompatible build.
 */
export function DeployModal({ onClose, onToast }: { onClose: () => void; onToast?: ToastFn }) {
  const { state, actions, meta } = useBuilder()
  const { categories, selections, index, result, totalCents, missingRequired, savedBuild, limits } =
    state
  const [phase, setPhase] = useState<Phase>('idle')
  const [stages, setStages] = useState<Stage[]>(freshStages)
  const [copied, setCopied] = useState(false)
  // Airtight re-entry guard — `phase` state alone can't cover two clicks in
  // one event batch; combined with busy-gated close the pipeline can't
  // double-run save+cart.
  const runningRef = useRef(false)

  const setStage = (i: number, status: StageStatus, lines: string[] = []) =>
    setStages((current) => current.map((s, j) => (j === i ? { ...s, status, lines } : s)))

  const slots = categories
    .filter((c) => (selections[c.id] ?? []).length > 0)
    .map((c) => ({ categoryId: c.id, componentIds: selections[c.id] }))

  const shareUrl = savedBuild
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/build/${savedBuild.shareId}`
    : undefined
  const manifestLines = buildManifest({
    slots,
    index,
    totalCents,
    recommendedPsuWatts: result.recommendedPsuWatts,
    ...(shareUrl ? { shareUrl } : {}),
  })

  const run = async () => {
    if (phase === 'running' || runningRef.current) return
    runningRef.current = true
    setPhase('running')
    setStages(freshStages())
    try {
      // Stage 1 — compatibility matrix. overLimit covers imported/hydrated
      // drafts that bypassed client caps — the server only WARNs on spec-cap
      // overage (validationSnapshot), so an over-cap build would dispatch to
      // cart without this check (entry-55 review).
      setStage(0, 'running')
      const overLimit = categories.flatMap((c) => {
        const count = (selections[c.id] ?? []).length
        const max = resolvedMax(limits, c)
        return count > max ? [`${c.name}: ${count} installed, max ${max}`] : []
      })
      const compat = checkCompatibility({
        missingRequired,
        validation: meta.validateCurrent(),
        overLimit,
      })
      await delay(STAGE_MIN_MS)
      if (!compat.ok) {
        setStage(0, 'failed', compat.blockers)
        setPhase('failed')
        onToast?.('Deploy halted — resolve compatibility blockers', 'error')
        return
      }
      setStage(0, 'passed', compat.notes)

      // Stage 2 — power envelope.
      setStage(1, 'running')
      const power = checkPowerEnvelope({
        recommendedPsuWatts: result.recommendedPsuWatts,
        psuRatedWatts: psuRatedWatts(selections, index),
        powerWarnings: result.powerWarnings,
      })
      await delay(STAGE_MIN_MS)
      if (!power.ok) {
        setStage(1, 'failed', power.blockers)
        setPhase('failed')
        onToast?.('Deploy halted — power envelope rejected', 'error')
        return
      }
      setStage(1, 'passed', power.notes)

      // Stage 3 — manifest registration (server draft + shareId).
      setStage(2, 'running')
      const saved = await minDelay(STAGE_MIN_MS, actions.saveDraft())
      if (!saved) {
        setStage(2, 'failed', ['The build draft could not be saved — retry'])
        setPhase('failed')
        onToast?.('Deploy halted — save failed', 'error')
        return
      }
      setStage(2, 'passed', [`Draft registered · ${saved.shareId}`])

      // Stage 4 — dispatch: add-build composite line → cart → drawer.
      setStage(3, 'running')
      const added = await minDelay(STAGE_MIN_MS, actions.addToCart())
      if (!added) {
        setStage(3, 'failed', ['Add to cart failed — the drawer stayed empty'])
        setPhase('failed')
        onToast?.('Deploy halted — dispatch failed', 'error')
        return
      }
      setStage(3, 'passed', ['Composite line added to cart'])
      setPhase('done')
      onToast?.('Rig dispatched to cart', 'success')
    } finally {
      runningRef.current = false
    }
  }

  const copyManifest = async () => {
    const text = `BuildMyRig — Deployment manifest\n${'-'.repeat(46)}\n${manifestLines.join('\n')}`
    if (await copyText(text)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      onToast?.('Build manifest copied', 'info')
    } else {
      onToast?.('Copy failed — select the manifest text instead', 'error')
    }
  }

  const doneCount = stages.filter((s) => s.status === 'passed').length
  const progressPct = Math.round((doneCount / stages.length) * 100)

  return (
    <StudioModalShell
      title="Deployment Matrix"
      subtitle="4-stage validation pipeline — real ops, not a demo"
      icon={<ShieldCheck size={16} />}
      onClose={onClose}
      busy={phase === 'running'}
    >
      <div className="studio-deploy-progress">
        <div className="studio-deploy-progress__labels">
          <span>Pre-flight validation</span>
          <span className="studio-deploy-progress__pct">{progressPct}%</span>
        </div>
        <div className="studio-deploy-progress__track">
          <div className="studio-deploy-progress__fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="studio-deploy-stages" aria-live="polite">
        {stages.map((stage) => (
          <div
            key={stage.title}
            className={`studio-deploy-stage studio-deploy-stage--${stage.status}`}
          >
            <div className="studio-deploy-stage__row">
              <div className="studio-deploy-stage__body">
                <span className="studio-deploy-stage__title">{stage.title}</span>
                <span className="studio-deploy-stage__detail">{stage.detail}</span>
                {stage.lines.map((line) => (
                  <span key={line} className="studio-deploy-stage__line">
                    {line}
                  </span>
                ))}
              </div>
              <span className={`studio-deploy-stage__status studio-deploy-stage__status--${stage.status}`}>
                {stage.status === 'running' ? (
                  <RotateCw size={11} aria-hidden="true" className="studio-spin" />
                ) : null}
                {STATUS_LABEL[stage.status]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <details className="studio-manifest">
        <summary>
          <ClipboardList size={12} aria-hidden="true" /> Build manifest
        </summary>
        <pre className="studio-manifest__pre">{manifestLines.join('\n')}</pre>
      </details>

      <div className="studio-deploy-total">
        <div>
          <span className="studio-deploy-total__label">Authorized dispatch</span>
          <span className="studio-deploy-total__sub">
            {slots.length} slot{slots.length === 1 ? '' : 's'} configured
          </span>
        </div>
        <span className="studio-deploy-total__amount">{formatEUR(totalCents)}</span>
      </div>

      <div className="studio-modal__foot studio-deploy-actions">
        <button type="button" className="studio-btn" onClick={copyManifest}>
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy manifest'}
        </button>
        <div className="studio-deploy-actions__right">
          {phase === 'done' ? (
            <button type="button" className="studio-deploy" onClick={onClose}>
              <CheckCircle2 size={14} aria-hidden="true" />
              Done — cart updated
            </button>
          ) : (
            <button
              type="button"
              className="studio-deploy"
              disabled={phase === 'running'}
              onClick={() => void run()}
            >
              {phase === 'running' ? (
                <RotateCw size={14} aria-hidden="true" className="studio-spin" />
              ) : (
                <Play size={14} aria-hidden="true" />
              )}
              {phase === 'failed'
                ? 'Retry deploy'
                : phase === 'running'
                  ? 'Deploying…'
                  : 'Run deploy'}
            </button>
          )}
        </div>
      </div>
    </StudioModalShell>
  )
}
