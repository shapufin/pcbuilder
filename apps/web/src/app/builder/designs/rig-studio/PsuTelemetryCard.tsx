'use client'

import { Zap } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { picksForZone, psuMargin, psuRatedWatts } from './studio-lib'

/**
 * PSU telemetry (port of the mockup's PsuTelemetryCard): engine-required draw
 * (recommendedPsuWatts) vs the chosen PSU's rated wattage — bar, load %,
 * headroom, and price, all real. With no PSU the meter is hidden and the
 * hint tells the user to pick one.
 */
export function PsuTelemetryCard() {
  const { state } = useBuilder()
  const { selections, index, result } = state

  const psu = picksForZone('psu', selections, index)[0]
  const required = result.recommendedPsuWatts
  const rated = psuRatedWatts(selections, index)
  const margin = psuMargin(result, selections, index)
  const loadPct = rated && rated > 0 ? Math.round((required / rated) * 100) : null
  const barPct = loadPct !== null ? Math.min(100, loadPct) : 0
  const tone =
    margin !== null && margin < 0
      ? 'danger'
      : loadPct !== null && loadPct > 90
        ? 'danger'
        : loadPct !== null && loadPct > 80
          ? 'warn'
          : 'ok'
  // Headroom % = margin / rated — how much PSU is left over the rating.
  const marginPct = rated && margin !== null ? Math.round((margin / rated) * 100) : null

  return (
    <div className="studio-card">
      <div className="studio-card__head">
        <div className="studio-card__title">
          <span className="studio-card__icon">
            <Zap size={14} aria-hidden="true" />
          </span>
          <span>PSU Load Telemetry</span>
        </div>
        <span className="studio-card__chip">
          {psu
            ? `${rated !== null ? `${rated}W ` : ''}${formatEUR(psu.priceCents)}`
            : 'No PSU'}
        </span>
      </div>

      <div className="studio-card__row">
        <div className="studio-telemetry__draw">
          <span className="studio-card__big">{required}W</span>
          <span className="studio-card__unit">Est. draw</span>
        </div>
        {rated !== null && loadPct !== null ? (
          <div className="studio-telemetry__meta">
            <span>
              Load: <strong>{loadPct}%</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Headroom:{' '}
              <strong className={`studio-telemetry__margin--${tone}`}>
                {margin !== null && margin >= 0 ? '+' : ''}
                {margin ?? 0}W
                {marginPct !== null ? ` (${marginPct}%)` : ''}
              </strong>
            </span>
          </div>
        ) : (
          <span className="studio-card__hint">Pick a PSU for load telemetry</span>
        )}
      </div>

      {rated !== null ? (
        <div
          className="studio-meter"
          role="meter"
          aria-label="PSU load"
          aria-valuemin={0}
          aria-valuemax={rated}
          aria-valuenow={required}
        >
          <div
            className={`studio-meter__fill studio-meter__fill--${tone}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}
