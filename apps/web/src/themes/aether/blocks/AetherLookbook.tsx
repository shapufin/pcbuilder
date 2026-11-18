import React from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Price } from '@/components/ui/Price'

type Rig = {
  title: string
  tier?: string
  summary?: string
  priceCents: number
  badge?: string
  specs?: string
  url?: string
}

export interface AetherLookbookProps {
  block: {
    heading: string
    eyebrow?: string
    subtitle?: string
    rigs?: Rig[]
  }
}

export function AetherLookbook({ block }: AetherLookbookProps) {
  const {
    heading,
    eyebrow = 'PRE-VALIDATED LABORATORY RIGS',
    subtitle = 'Fully assembled, stress-tested for 24h, and thermal-certified for production workflows.',
    rigs = [
      {
        title: 'Aether Apex Workstation',
        tier: 'Tier 1 // Monolith Extreme',
        summary: 'Direct-die liquid cooling with dual D5 pumps, custom manifold, and titanium cables.',
        priceCents: 489000,
        badge: '24H BURN-IN PASSED',
        specs: 'RTX 5090 · 9950X3D · 96GB DDR5 6400 · 4TB Gen5',
        url: '/builder',
      },
      {
        title: 'Aether Studio ITX Compact',
        tier: 'Tier 2 // Small Footprint Liquid',
        summary: 'Under-15L CNC chassis with custom copper distribution block and whisper-silent fan profile.',
        priceCents: 325000,
        badge: 'THERMAL CERTIFIED',
        specs: 'RTX 5080 · 9800X3D · 64GB DDR5 · 2TB Gen4',
        url: '/builder',
      },
      {
        title: 'Aether Compute Node Alpha',
        tier: 'Tier 3 // Render & Simulation Lab',
        summary: 'Workstation platform tuned for continuous multi-GPU rendering and LLM model fine-tuning.',
        priceCents: 649000,
        badge: 'ISO-04 CERTIFIED',
        specs: 'Dual RTX 5090 · Threadripper 7965WX · 128GB ECC',
        url: '/builder',
      },
    ],
  } = block

  return (
    <section className="ae-lookbook" aria-label="Pre-Validated Laboratory Rigs">
      <div className="ae-lookbook__container">
        <div className="ae-u-text-center">
          {eyebrow ? <p className="ae-lab__eyebrow">{eyebrow}</p> : null}
          <h2 className="ae-lab__heading">{heading}</h2>
          {subtitle ? <p className="ae-lab__subtitle">{subtitle}</p> : null}
        </div>

        <div className="ae-lookbook__grid">
          {rigs.map((rig, i) => (
            <div key={i} className="ae-lookbook__card">
              <div>
                {rig.badge ? (
                  <div className="ae-lookbook__badge">
                    <span className="ae-u-flex ae-u-items-center ae-u-gap-1">
                      <ShieldCheck size={12} />
                      {rig.badge}
                    </span>
                  </div>
                ) : null}

                <div className="ae-u-font-mono ae-u-text-xs ae-u-uppercase ae-u-tracking-wider ae-u-text-primary ae-u-font-semibold ae-u-mb-1">
                  {rig.tier}
                </div>
                <h3 className="ae-lookbook__title">{rig.title}</h3>
                {rig.summary ? <p className="ae-u-text-xs ae-u-text-muted ae-u-mb-3">{rig.summary}</p> : null}
                {rig.specs ? <p className="ae-lookbook__specs">{rig.specs}</p> : null}
              </div>

              <div className="ae-u-mt-6 ae-u-flex ae-u-items-center ae-u-justify-between ae-u-border-t ae-u-pt-4">
                <div>
                  <span className="ae-u-block ae-u-text-10 ae-u-uppercase ae-u-font-mono ae-u-text-subtle">Certified Rig From</span>
                  <div className="ae-lookbook__price">
                    <Price cents={rig.priceCents} />
                  </div>
                </div>

                <Link
                  href={rig.url || '/builder'}
                  className="btn btn-primary ae-u-inline-flex ae-u-items-center ae-u-gap-1_5 ae-u-text-xs ae-u-px-3 ae-u-py-2"
                >
                  <span>Configure</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
