'use client'

import { ArrowRightLeft, Check } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { ModalShell } from '../../kit/ModalShell'
import type { BuilderToast } from '../../kit/BuilderToasts'
import type { OptionRow } from '../../kit/option-rows'
import { highlightFor, wattsOf } from '../../kit/part-lib'

/**
 * Atelier swap sheet (entry 131) — the mockup's component modal: a clean
 * list of candidates with price, Δprice, Δpower and the engine's exclusion
 * reason. Same data path as rig-studio (meta.optionRows), different
 * presentation, shared dialog a11y via kit/ModalShell.
 */
export function AtelierSwapSheet({
  categoryId,
  onClose,
  onToast,
}: {
  categoryId: string
  onClose: () => void
  onToast: (message: string, kind?: BuilderToast['kind']) => void
}) {
  const { state, actions, meta } = useBuilder()
  const category = state.categories.find((c) => c.id === categoryId)
  if (!category) return null

  const rows = meta.optionRows(category.id)
  const selectedIds = state.selections[category.id] ?? []
  const max = state.limits[category.id]?.max ?? 1
  const cappedBy = state.limits[category.id]?.cappedBy
  const current = selectedIds
    .map((id) => meta.entryOf(id)?.display?.name ?? id)
    .join(', ')

  const pick = (row: OptionRow) => {
    if (row.excludedReason || !row.inStock) return
    const installing = !row.selected
    actions.select(category.id, row.entry.id)
    if (!installing) {
      // Clicking an installed row toggles it off (store contract) — say so,
      // don't toast "installed" and close the sheet.
      onToast(`${row.entry.display?.name ?? 'Component'} removed`, 'info')
      return
    }
    onToast(`${row.entry.display?.name ?? 'Component'} installed`, 'success')
    if (selectedIds.length + 1 >= max) onClose()
  }

  return (
    <ModalShell
      title={`Select ${category.name}`}
      subtitle={`Current: ${current || '—'}`}
      icon={<ArrowRightLeft size={16} />}
      onClose={onClose}
      wide
    >
      {cappedBy ? (
        <p className="atl-issues atl-issues--pending">
          Max {max} installed — limited by {cappedBy.componentName ?? cappedBy.componentId} (
          {cappedBy.field})
        </p>
      ) : null}
      <div className="atl-options">
        {rows.map((row) => {
          const disabled = Boolean(row.excludedReason) || !row.inStock
          const reason = row.excludedReason ?? (!row.inStock ? 'Out of stock' : undefined)
          return (
            <button
              key={row.entry.id}
              type="button"
              className={`atl-option${row.selected ? ' atl-option--selected' : ''}`}
              disabled={disabled}
              title={reason}
              onClick={() => pick(row)}
            >
              <span className="atl-option__main">
                {row.entry.display?.image ? (
                  <span className="atl-option__media">
                    <img src={row.entry.display.image} alt="" loading="lazy" />
                  </span>
                ) : null}
                <span className="atl-option__name">{row.entry.display?.name ?? row.entry.id}</span>
                <span className="atl-option__meta">
                  {row.entry.display?.brand ? <span>{row.entry.display.brand}</span> : null}
                  <span>{highlightFor(category, row.entry)}</span>
                  <span>{wattsOf(row.entry)}W</span>
                  {row.entry.display?.hasRgb ? <span className="atl-option__rgb">RGB</span> : null}
                </span>
                {reason ? <span className="atl-option__reason">{reason}</span> : null}
              </span>
              <span className="atl-option__right">
                <span className="atl-option__price">{formatEUR(row.entry.priceCents)}</span>
                <span
                  className={
                    row.deltaCents > 0
                      ? 'atl-option__delta atl-option__delta--up'
                      : row.deltaCents < 0
                        ? 'atl-option__delta atl-option__delta--down'
                        : 'atl-option__delta'
                  }
                >
                  {row.deltaCents === 0
                    ? 'same'
                    : `${row.deltaCents > 0 ? '+' : ''}${formatEUR(row.deltaCents)}`}
                </span>
                <span className={`atl-option__cta${row.selected ? ' atl-option__cta--on' : ''}`}>
                  {row.selected ? (
                    <>
                      <Check size={12} aria-hidden="true" /> Installed
                    </>
                  ) : (
                    'Select'
                  )}
                </span>
              </span>
            </button>
          )
        })}
        {rows.length === 0 ? <p className="atl-empty">No components in this category yet.</p> : null}
      </div>

      <div className="atl-sheet-foot">
        <span>
          {selectedIds.length}/{max} installed
        </span>
        <button
          type="button"
          className="atl-slot__change"
          disabled={selectedIds.length === 0}
          onClick={() => actions.clearSlot(category.id)}
        >
          Clear slot
        </button>
      </div>
    </ModalShell>
  )
}
