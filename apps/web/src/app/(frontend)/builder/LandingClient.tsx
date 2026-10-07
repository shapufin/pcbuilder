'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useBuilderStore } from './builder-store'
import { dialogMotion, prefersReducedMotion } from '@/lib/motion'
import type { LandingTemplate } from './page'
import { formatEUR } from '@/components/ui/Price'

const USE_CASES = ['gaming', 'editing', 'streaming', 'workstation'] as const
const TIERS = [
  { id: 'value', label: 'Solid value', factor: 0.85 },
  { id: 'balanced', label: 'Balanced', factor: 1 },
  { id: 'flagship', label: 'No compromises', factor: 1.3 },
] as const

type Props = { templates: LandingTemplate[] }

export function LandingClient({ templates }: Props) {
  const router = useRouter()
  const startFresh = useBuilderStore((s) => s.startFresh)
  const applyTemplate = useBuilderStore((s) => s.applyTemplate)
  const [guidedOpen, setGuidedOpen] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  const startScratch = () => {
    startFresh('scratch')
    void router.push('/builder/configure')
  }

  const startOnPath = (path: 'amd' | 'intel') => {
    startFresh('scratch')
    void router.push(`/builder/configure?path=${path}`)
  }

  const applyLandingTemplate = (t: LandingTemplate, mode: 'guided' | 'template' = 'template') => {
    applyTemplate(
      t.id,
      t.slots.map((s) => ({ categoryId: s.categoryId, componentId: s.componentId })),
      mode,
    )
    void router.push('/builder/configure')
  }

  const scrollToTemplates = () => {
    carouselRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="builder-page">
      <section className="landing-hero">
        <h1>Build your perfect rig</h1>
        <p>Pick every part with live compatibility checks — or start from a build that already works.</p>
        <div className="path-row" role="group" aria-label="Build path">
          <span className="path-row__label">Build path:</span>
          <button type="button" className="path-pill" onClick={() => startOnPath('amd')}>
            AMD <span className="path-pill__hint">AM5</span>
          </button>
          <button type="button" className="path-pill" onClick={() => startOnPath('intel')}>
            Intel <span className="path-pill__hint">LGA</span>
          </button>
          <button type="button" className="path-pill" onClick={startScratch}>
            No preference
          </button>
        </div>
        <div className="choice-grid">
          <button type="button" className="choice-card choice-card--primary" onClick={startScratch}>
            <strong>Start from scratch</strong>
            <span>Guided step-by-step through every slot, with conflicts flagged as you go.</span>
          </button>
          <button type="button" className="choice-card" onClick={() => setGuidedOpen(true)}>
            <strong>Answer 3 quick questions</strong>
            <span>Budget, use case and ambition — we match you to the closest proven build.</span>
          </button>
          <button type="button" className="choice-card" onClick={scrollToTemplates}>
            <strong>Start from a template</strong>
            <span>Proven configurations you can tweak part by part.</span>
          </button>
        </div>
      </section>

      <section className="landing-hero landing-hero--flush" id="templates" ref={carouselRef}>
        <h2>Build templates</h2>
        {templates.length === 0 ? (
          <p className="state-msg">
            No templates yet — <button type="button" className="btn btn--primary" onClick={startScratch}>start from scratch</button>
          </p>
        ) : (
          <div className="template-rail">
            {templates.map((t, i) => (
              <motion.article
                key={t.id}
                className="template-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              >
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt={t.name} />
                ) : (
                  <div className="skeleton template-card__placeholder" aria-hidden="true" />
                )}
                <strong>{t.name}</strong>
                {t.description && (
                  <span className="template-card__desc">{t.description}</span>
                )}
                <div className="template-tags">
                  {(t.tags ?? []).map((tag) => (
                    <span className="tag" key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="template-card__foot">
                  <span className="template-card__price">{formatEUR(t.basePriceCents)}</span>
                  <button type="button" className="btn btn--primary" onClick={() => applyLandingTemplate(t)}>
                    Use this build
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {guidedOpen && (
          <GuidedQuestionsDialog
            templates={templates}
            onClose={() => setGuidedOpen(false)}
            onStart={(t) => {
              setGuidedOpen(false)
              applyLandingTemplate(t, 'guided')
            }}
            onNoMatch={startScratch}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

interface DialogProps {
  templates: LandingTemplate[]
  onClose: () => void
  onStart: (t: LandingTemplate) => void
  onNoMatch: () => void
}

function GuidedQuestionsDialog({ templates, onClose, onStart, onNoMatch }: DialogProps) {
  const [budget, setBudget] = useState(1800)
  const [useCase, setUseCase] = useState<(typeof USE_CASES)[number]>('gaming')
  const [tier, setTier] = useState<(typeof TIERS)[number]['id']>('balanced')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const suggestion = useMemo(() => {
    if (templates.length === 0) return null
    const factor = TIERS.find((t) => t.id === tier)?.factor ?? 1
    const target = budget * factor * 100
    const ranked = [...templates].sort((a, b) => {
      const score = (t: LandingTemplate): number => {
        const priceDistance = Math.abs(t.basePriceCents - target) / Math.max(target, 1)
        const tagPenalty = (t.tags ?? []).includes(useCase) ? 0 : 0.5
        return priceDistance + tagPenalty
      }
      return score(a) - score(b)
    })
    return ranked[0]
  }, [budget, useCase, tier, templates])

  return (
    <motion.div
      className="dialog-backdrop"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-title"
        {...dialogMotion(prefersReducedMotion())}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="guided-title">Find your starting point</h2>

        <div className="field">
          <label htmlFor="budget">Budget: {formatEUR(budget * 100)}</label>
          <input
            id="budget"
            type="range"
            min={600}
            max={4000}
            step={100}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="usecase">What will you mostly do?</label>
          <select id="usecase" value={useCase} onChange={(e) => setUseCase(e.target.value as typeof useCase)}>
            {USE_CASES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="tier">How ambitious?</label>
          <select id="tier" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
            {TIERS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {suggestion ? (
          <div className="guided-suggestion">
            <div className="guided-suggestion__card">
              <strong>{suggestion.name}</strong>
              <div className="guided-suggestion__meta">
                {formatEUR(suggestion.basePriceCents)} · {(suggestion.tags ?? []).join(', ') || 'starter build'}
              </div>
            </div>
            <div className="dialog__actions">
              <button type="button" className="btn btn--ghost" onClick={onNoMatch}>
                Start from scratch instead
              </button>
              <button type="button" className="btn btn--primary" onClick={() => onStart(suggestion)}>
                Start with this
              </button>
            </div>
          </div>
        ) : (
          <div className="dialog__actions">
            <button type="button" className="btn" onClick={onClose}>Close</button>
            <button type="button" className="btn btn--primary" onClick={onNoMatch}>Start from scratch</button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
