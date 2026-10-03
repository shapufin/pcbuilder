'use client'

import { ArrowRightLeft, Table } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import {
  iconForCategory,
  priceCentsOf,
  psuRatedWatts,
  slotCode,
  wattsOf,
  zoneForCategory,
} from './studio-lib'
import { SlotGlyph } from './StudioSlotCard'

/**
 * Compact matrix (port of CompactMatrixView.tsx): dense table of ALL
 * categories — even those without a blueprint zone (os, case-fan, admin custom)
 * because the degrade contract makes them full citizens here. Pick names, watts
 * (Σ tdpWatts of the picks), EUR subtotal, n/max and Swap → same modal as the
 * bay. Small-screen fallback of the studio view.
 */
export function CompactMatrixView({
  onOpenSwap,
}: {
  onOpenSwap: (categoryId: string) => void
}) {
  const { state, meta } = useBuilder()
  const { categories, selections, index, limits, totalCents } = state

  const configured = categories.filter(
    (c) => (selections[c.id] ?? []).length > 0,
  ).length
  const totalWatts = Object.values(selections)
    .flat()
    .reduce((sum, id) => sum + wattsOf(meta.entryOf(id)), 0)
  const rated = psuRatedWatts(selections, index)
  const psuPct = rated ? Math.min(100, Math.round((totalWatts / rated) * 100)) : null

  return (
    <div className="studio-matrix">
      <div className="studio-matrix__head">
        <div className="studio-card__title">
          <span className="studio-card__icon">
            <Table size={14} aria-hidden="true" />
          </span>
          <div>
            <h2 className="studio-matrix__title">Compact hardware matrix</h2>
            <div className="studio-matrix__meta">
              <span>
                {configured} / {categories.length} slots configured
              </span>
              <span aria-hidden="true">·</span>
              <span>
                TDP: <strong>{totalWatts}W</strong>
                {psuPct !== null ? ` (${psuPct}% of PSU)` : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="studio-matrix__total">
          <span className="studio-total__label">Total investment</span>
          <span className="studio-total__amount">{formatEUR(totalCents)}</span>
        </div>
      </div>

      <div className="studio-matrix__tableWrap">
        <table className="studio-matrix__table">
          <thead>
            <tr>
              <th scope="col">Slot</th>
              <th scope="col">Component</th>
              <th scope="col" className="studio-matrix__num">Power</th>
              <th scope="col" className="studio-matrix__num">Price</th>
              <th scope="col" className="studio-matrix__num">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const picks = (selections[category.id] ?? [])
                .map((id) => meta.entryOf(id))
                .filter((e): e is NonNullable<typeof e> => Boolean(e))
              const watts = picks.reduce((s, e) => s + wattsOf(e), 0)
              const cents = picks.reduce((s, e) => s + priceCentsOf(e), 0)
              const max = limits[category.id]?.max ?? category.maxSelectable
              const names = picks.map((e) => e.display?.name ?? e.id).join(', ')
              const zone = zoneForCategory(category.slug)
              return (
                <tr
                  key={category.id}
                  data-zone={zone}
                  className="studio-matrix__row"
                  onClick={() => onOpenSwap(category.id)}
                >
                  <td>
                    <div className="studio-matrix__slot">
                      <span className="studio-matrix__icon" aria-hidden="true">
                        <SlotGlyph icon={iconForCategory(category.slug)} size={13} />
                      </span>
                      <span>
                        <span className="studio-matrix__code">
                          {slotCode(category, picks[0], 1)}
                        </span>
                        <span className="studio-matrix__catName">{category.name}</span>
                      </span>
                    </div>
                  </td>
                  <td className="studio-matrix__component">
                    {names ? (
                      <>
                        <span className="studio-matrix__name">{names}</span>
                        <span className="studio-matrix__sub">
                          {picks.length}/{max} installed
                        </span>
                      </>
                    ) : (
                      <span className="studio-matrix__empty">Empty slot</span>
                    )}
                  </td>
                  <td className="studio-matrix__num">
                    <span className="studio-matrix__watts">{watts}W</span>
                    <span className="studio-matrix__unit">TDP</span>
                  </td>
                  <td className="studio-matrix__num">
                    <span className="studio-matrix__price">{formatEUR(cents)}</span>
                    <span className={picks.length > 0 ? 'studio-matrix__status' : 'studio-matrix__empty'}>
                      {picks.length > 0 ? 'Installed' : '—'}
                    </span>
                  </td>
                  <td className="studio-matrix__num">
                    <button
                      type="button"
                      className="studio-swap-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenSwap(category.id)
                      }}
                    >
                      <ArrowRightLeft size={11} aria-hidden="true" />
                      Swap
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
