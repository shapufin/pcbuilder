import React from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react'

type Cta = { label: string; url: string; style?: 'primary' | 'outline' | 'ghost' }
type Metric = { label: string; value: string; delta?: string }

export interface AetherHeroProps {
  block: {
    badge?: string
    heading: string
    highlightText?: string
    body?: string
    ctas?: Cta[]
    telemetryMetrics?: Metric[]
  }
}

export function AetherHero({ block }: AetherHeroProps) {
  const {
    badge = 'ZURICH HIGH-COMPUTE WORKSTATION LAB // BATCH 5090 READY',
    heading,
    highlightText,
    body,
    ctas = [
      { label: 'Configure Custom Loop Rig', url: '/builder', style: 'primary' },
      { label: 'Explore Hardware Lab', url: '/shop', style: 'outline' },
    ],
    telemetryMetrics = [
      { label: 'Thermal Delta Under Load', value: 'ΔT 11.4°C', delta: '-18% vs Air' },
      { label: 'Silicon SP Score (Top 1%)', value: 'SP 114 Gold', delta: 'Binned' },
      { label: 'Acoustic Noise Floor', value: '23.8 dBA', delta: 'Whisper Silent' },
      { label: 'Burn-In Stress Telemetry', value: '24 Hours', delta: '100% Passed' },
    ],
  } = block

  // Split heading by highlightText if provided
  let preText = heading
  let accentText = ''
  let postText = ''

  if (highlightText && heading.includes(highlightText)) {
    const idx = heading.indexOf(highlightText)
    preText = heading.slice(0, idx)
    accentText = highlightText
    postText = heading.slice(idx + highlightText.length)
  }

  return (
    <section className="ae-hero" aria-label="Aether High-Compute Hero">
      <div className="ae-hero__container">
        <div>
          {badge ? (
            <div className="ae-hero__badge">
              <Zap size={14} />
              <span>{badge}</span>
            </div>
          ) : null}

          <h1 className="ae-hero__heading">
            {accentText ? (
              <>
                {preText}
                <span className="ae-hero__heading-accent">{accentText}</span>
                {postText}
              </>
            ) : (
              heading
            )}
          </h1>

          {body ? <p className="ae-hero__body">{body}</p> : null}

          <div className="ae-hero__actions">
            {ctas.map((cta, i) => {
              const isPrimary = cta.style === 'primary' || !cta.style
              return (
                <Link
                  key={`${cta.url}-${i}`}
                  href={cta.url}
                  className={`btn ${isPrimary ? 'btn-primary' : 'btn-outline'} ae-u-inline-flex ae-u-items-center ae-u-gap-2`}
                  style={
                    !isPrimary
                      ? {
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text)',
                        }
                      : undefined
                  }
                >
                  <span>{cta.label}</span>
                  <ArrowRight size={16} />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Telemetry Run-In Card */}
        <div className="ae-hero__telemetry-card">
          <div className="ae-u-mb-4 ae-u-flex ae-u-items-center ae-u-justify-between">
            <div className="ae-u-flex ae-u-items-center ae-u-gap-2">
              <ShieldCheck className="ae-hero-x-1" size={18} />
              <span className="ae-u-font-mono ae-u-text-xs ae-u-font-bold ae-u-uppercase ae-u-tracking-wider ae-u-text-strong">
                Laboratory Telemetry Bench
              </span>
            </div>
            <span
              className="ae-u-rounded ae-u-px-2 ae-u-py-0_5 ae-u-font-mono ae-u-text-xs ae-u-font-bold ae-hero-x-2"
            >
              ACTIVE RUN
            </span>
          </div>

          <div className="ae-u-space-y-1">
            {telemetryMetrics.map((m, idx) => (
              <div key={idx} className="ae-telemetry-row">
                <span className="ae-telemetry-label">{m.label}</span>
                <div className="ae-u-flex ae-u-items-center ae-u-gap-3">
                  <span className="ae-telemetry-value">{m.value}</span>
                  {m.delta ? <span className="ae-telemetry-delta">{m.delta}</span> : null}
                </div>
              </div>
            ))}
          </div>

          <div className="ae-u-mt-4 ae-u-pt-4 ae-u-border-t ae-u-text-xs ae-u-text-subtle ae-u-font-mono ae-u-flex ae-u-justify-between">
            <span>TEST RIG: AETHER-5090X</span>
            <span>CHAMBER: 21.0°C AMBIENT</span>
          </div>
        </div>
      </div>
    </section>
  )
}
