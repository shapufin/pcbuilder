'use client'

import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { highlightFor, iconForCategory, psuRatedWatts, wattsOf } from '../../kit/part-lib'
import { powerReserve, slotIndex, slotLabel } from './atelier-lib'

/**
 * Atelier spec sheet (entry 131) — the mockup's right column: numbered
 * editorial slots, live prices, a power-reserve bar and the commission CTA.
 * It replaces the mockup's photo previews with real spec chips (the catalog
 * has no per-component photography), and every row is a real category from
 * the builder index — including custom admin categories (degrade contract).
 */
export function SpecSheet({
  onOpenSwap,
  onCommission,
}: {
  onOpenSwap: (categoryId: string) => void
  onCommission: () => void
}) {
  const { state, meta } = useBuilder()
  const { categories, selections, index, result, totalCents } = state
  const rated = psuRatedWatts(selections, index)
  const reserve = powerReserve(result.recommendedPsuWatts, rated)
  const configured = categories.filter((c) => (selections[c.id] ?? []).length > 0).length

  return (
    <section className="atl-sheet" aria-label="Bespoke spec sheet">
      <div className="atl-sheet__head">
        <div className="atl-sheet__meta">
          <span className="atl-sheet__order">Atelier order · live draft</span>
          <span className="atl-sheet__badge">Hand-built</span>
        </div>
        <div className="atl-sheet__title-row">
          <h2 className="atl-sheet__title">Bespoke spec sheet</h2>
          <span className="atl-sheet__price">{formatEUR(totalCents)}</span>
        </div>
        <p className="atl-sheet__copy">
          Assembled from validated parts — the server recomputes the price and the clearance matrix at
          checkout.
        </p>
      </div>

      <ul className="atl-slots">
        {categories.map((category, i) => {
          const picks = selections[category.id] ?? []
          const entries = picks.map((id) => meta.entryOf(id)).filter(Boolean)
          const Icon = iconForCategory(category.slug)
          const first = entries[0]
          const subtotal = entries.reduce((sum, e) => sum + (e?.priceCents ?? 0), 0)
          const isFilled = picks.length > 0
          return (
            <li key={category.id} className={`atl-slot${isFilled ? ' atl-slot--filled' : ''}`}>
              <span className="atl-slot__num">{slotIndex(i + 1)}</span>
              <span className="atl-slot__icon" aria-hidden="true">
                {first?.display?.image ? (
                  <img src={first.display.image} alt="" loading="lazy" />
                ) : (
                  <Icon size={16} />
                )}
              </span>
              <span className="atl-slot__body">
                <span className="atl-slot__label">
                  {slotLabel(category.slug, category.name)}
                  {category.required && !isFilled ? (
                    <span className="atl-slot__req">required</span>
                  ) : null}
                </span>
                <span className="atl-slot__name">
                  {isFilled
                    ? entries
                        .map((e) => e?.display?.name ?? e?.id)
                        .filter(Boolean)
                        .join(' + ')
                    : 'Not configured'}
                </span>
                <span className="atl-slot__spec">
                  {isFilled
                    ? [highlightFor(category, first), wattsOf(first) > 0 ? `${wattsOf(first)}W` : null]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Pick a part to see its fit, power and price'}
                </span>
              </span>
              <span className="atl-slot__right">
                <span className="atl-slot__price">{isFilled ? formatEUR(subtotal) : '—'}</span>
                <button
                  type="button"
                  className="atl-slot__change"
                  onClick={() => onOpenSwap(category.id)}
                  aria-label={`${isFilled ? 'Change' : 'Add'} ${category.name}`}
                >
                  {isFilled ? 'Change' : 'Add'}
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      <div className="atl-reserve">
        <div className="atl-reserve__row">
          <span className="atl-reserve__label">Estimated draw vs PSU reserve</span>
          <span className="atl-reserve__value">
            <strong>{result.recommendedPsuWatts}W</strong>
            <span>{rated !== null ? ` / ${rated}W` : ' / no PSU'}</span>
          </span>
        </div>
        <div
          className="atl-reserve__bar"
          role={rated !== null ? 'meter' : undefined}
          aria-label={rated !== null ? 'PSU load' : undefined}
          aria-valuemin={rated !== null ? 0 : undefined}
          aria-valuemax={rated ?? undefined}
          aria-valuenow={rated !== null ? result.recommendedPsuWatts : undefined}
        >
          <span
            className={`atl-reserve__fill atl-reserve__fill--${reserve.tone}`}
            style={{ width: `${reserve.loadPct ?? 0}%` }}
          />
        </div>
        <div className="atl-reserve__foot">
          <span>
            {reserve.reserveWatts !== null
              ? `${reserve.reserveWatts >= 0 ? '+' : ''}${reserve.reserveWatts}W reserve`
              : 'Pick a power supply for load telemetry'}
          </span>
          <span>
            {configured}/{categories.length} slots
          </span>
        </div>
      </div>

      <div className="atl-commission">
        <div className="atl-commission__copy">
          <span>Build lead time</span>
          <strong>5 business days</strong>
        </div>
        <button type="button" className="atl-cta atl-cta--wide" onClick={onCommission}>
          Commission bespoke rig
        </button>
      </div>
    </section>
  )
}
