'use client'

import Link from 'next/link'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { psuRatedWatts } from '../../kit/part-lib'
import type { AtelierView } from './atelier-lib'
import { powerReserve } from './atelier-lib'

/**
 * Atelier top bar (entry 131) — the page's only header (the route is
 * immersive). Editorial split: brand + numbered screen tabs on the left,
 * telemetry + total + commission CTA on the right. Every number is live
 * builder data; the palette comes from the theme via --color-* and the
 * --bd-* ramp, so it restyles with the admin theme like every other surface.
 */
export function AtelierHeader({
  view,
  onViewChange,
  onCommission,
  onOpenSaved,
}: {
  view: AtelierView
  onViewChange: (view: AtelierView) => void
  onCommission: () => void
  onOpenSaved: () => void
}) {
  const { state } = useBuilder()
  const { index, selections, result, totalCents } = state
  const rated = psuRatedWatts(selections, index)
  const reserve = powerReserve(result.recommendedPsuWatts, rated)

  return (
    <header className="atl-header">
      <div className="atl-header__brand">
        <Link href="/" className="atl-back" aria-label="Back to store">
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Store</span>
        </Link>
        <span className="atl-mark" aria-hidden="true">
          AT
        </span>
        <span className="atl-brand__text">
          <strong>BuildMyRig</strong>
          <em>Atelier / bespoke rig architecture</em>
        </span>
      </div>

      <nav className="atl-tabs" aria-label="Atelier screens">
        <button
          type="button"
          className={`atl-tab${view === 'studio' ? ' atl-tab--active' : ''}`}
          aria-pressed={view === 'studio'}
          onClick={() => onViewChange('studio')}
        >
          <span className="atl-tab__num">01.</span> Minimal Studio
        </button>
        <button
          type="button"
          className={`atl-tab${view === 'blueprint' ? ' atl-tab--active' : ''}`}
          aria-pressed={view === 'blueprint'}
          onClick={() => onViewChange('blueprint')}
        >
          <span className="atl-tab__num">02.</span> Architectural Blueprint
        </button>
      </nav>

      <div className="atl-header__actions">
        <span
          className={`atl-watts atl-watts--${reserve.tone}`}
          title={
            rated !== null
              ? `Estimated draw ${result.recommendedPsuWatts}W of ${rated}W`
              : `Estimated draw ${result.recommendedPsuWatts}W — no PSU selected`
          }
        >
          <strong>{result.recommendedPsuWatts}W</strong>
          <span>{rated !== null ? `/ ${rated}W` : '/ — W'}</span>
        </span>

        <span className="atl-total">
          <em>Config total</em>
          <strong>{formatEUR(totalCents)}</strong>
        </span>

        <button
          type="button"
          className="atl-icon-btn"
          onClick={onOpenSaved}
          aria-label="Saved builds"
          title="Saved builds"
        >
          <Bookmark size={15} aria-hidden="true" />
        </button>

        <button type="button" className="atl-cta" onClick={onCommission}>
          Commission bespoke rig
        </button>
      </div>
    </header>
  )
}
