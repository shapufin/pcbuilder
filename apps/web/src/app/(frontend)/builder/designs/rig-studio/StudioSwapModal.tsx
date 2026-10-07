'use client'

import { useEffect, useId, useRef } from 'react'
import { resolvedMax } from '@buildmyrig/lib'
import { AlertTriangle, ArrowRightLeft, Check, X } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { trackBuildStepCompleted } from '@/lib/analytics'
import { useBuilder } from '../../builder-provider'
import type { OptionRow } from '../../kit/option-rows'
import type { BuilderToast } from '../../kit/BuilderToasts'
import { highlightFor, wattsOf, type StudioCategory } from './studio-lib'

type ToastFn = (message: string, kind?: BuilderToast['kind']) => void

const deltaCentsLabel = (cents: number): string =>
  cents > 0 ? `+${formatEUR(cents)}` : formatEUR(cents)

const deltaWattsLabel = (watts: number): string =>
  `${watts > 0 ? '+' : ''}${watts}W`

/**
 * Swap modal (port of SwapModal.tsx) on top of meta.optionRows(): rows with
 * real Δprice/Δwatts, excluded ones disabled with the engine's reason,
 * out-of-stock disabled, multi-pick up to the cap resolved by the provider.
 * A11y dialog: Escape + backdrop close, initial focus + restore, scroll-lock.
 */
export function StudioSwapModal({
  categoryId,
  onClose,
  onToast,
}: {
  categoryId: string
  onClose: () => void
  onToast?: ToastFn
}) {
  const { state, actions, meta } = useBuilder()
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  // Escape + scroll-lock + focus management. autoFocus attribute is banned by
  // jsx-a11y/no-autofocus → focus via ref on mount; restore on dismount.
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  const category = state.categories.find((c) => c.id === categoryId)
  if (!category) return null

  const rows = meta.optionRows(category.id)
  const selectedIds = state.selections[category.id] ?? []
  const limit = state.limits[category.id]
  const max = resolvedMax(state.limits, category)
  const currentNames = selectedIds
    .map((id) => meta.entryOf(id)?.display?.name ?? id)
    .join(', ')

  const handlePick = (row: OptionRow) => {
    if (row.excludedReason || !row.inStock) return
    const installing = !row.selected
    actions.select(category.id, row.entry.id)
    if (!installing) return
    // Funnel: an install via swap counts as a completed step, like the
    // step advance of the Configurator (step_index = category position).
    const stepIndex = state.categories.findIndex((c) => c.id === category.id)
    const selectedCount = Math.min(selectedIds.length + 1, max)
    trackBuildStepCompleted(category.name, Math.max(0, stepIndex), selectedCount)
    // At cap the store evicts the oldest pick (evict-oldest contract) — say
    // so, or the user can't tell their earlier pick was dropped (entry-55).
    const evicted = max > 1 && selectedIds.length >= max
    onToast?.(
      `${row.entry.display?.name ?? 'Component'} installed${evicted ? ' — oldest pick evicted' : ''}`,
      'success',
    )
    if (max <= 1) onClose()
  }

  return (
    <div className="studio-modal">
      <button
        type="button"
        className="studio-modal__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className="studio-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="studio-modal__head">
          <span className="studio-modal__icon" aria-hidden="true">
            <ArrowRightLeft size={16} />
          </span>
          <div className="studio-modal__titles">
            <h3 id={titleId} className="studio-modal__title">
              Select {category.name}
            </h3>
            <p className="studio-modal__current">
              Current: <strong>{currentNames || '—'}</strong>
            </p>
          </div>
          <button
            type="button"
            ref={closeRef}
            className="studio-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {limit?.cappedBy && (
          <div className="studio-modal__cap" role="status">
            <AlertTriangle size={13} aria-hidden="true" />
            <span>
              Max {max} installed — limited by {limit.cappedBy.componentName ?? limit.cappedBy.componentId}{' '}
              ({limit.cappedBy.field})
            </span>
          </div>
        )}

        <div className="studio-modal__rows">
          {rows.map((row) => (
            <SwapOptionRow
              key={row.entry.id}
              row={row}
              category={category}
              onPick={handlePick}
            />
          ))}
          {rows.length === 0 && (
            <p className="studio-modal__empty">No components in this category yet.</p>
          )}
        </div>

        <div className="studio-modal__foot">
          <span className="studio-modal__count">
            {selectedIds.length}/{max} installed
          </span>
          <button
            type="button"
            className="studio-modal__clear"
            disabled={selectedIds.length === 0}
            onClick={() => actions.clearSlot(category.id)}
          >
            Clear slot
          </button>
        </div>
      </div>
    </div>
  )
}

function SwapOptionRow({
  row,
  category,
  onPick,
}: {
  row: OptionRow
  category: StudioCategory
  onPick: (row: OptionRow) => void
}) {
  const disabled = Boolean(row.excludedReason) || !row.inStock
  const name = row.entry.display?.name ?? row.entry.id
  const brand = row.entry.display?.brand
  const watts = wattsOf(row.entry)
  const reason = row.excludedReason ?? (!row.inStock ? 'Out of stock' : undefined)

  return (
    <button
      type="button"
      className={`studio-option${row.selected ? ' studio-option--selected' : ''}`}
      disabled={disabled}
      title={reason}
      onClick={() => onPick(row)}
    >
      <span className="studio-option__top">
        <span className="studio-option__highlight">{highlightFor(category, row.entry)}</span>
        {row.entry.display?.hasRgb && <span className="studio-option__rgb">RGB sync</span>}
        <span className="studio-option__price">{formatEUR(row.entry.priceCents)}</span>
      </span>

      <span className="studio-option__name">{name}</span>
      {brand && <span className="studio-option__brand">{brand}</span>}

      <span className="studio-option__specs">
        <span className="studio-option__spec">
          <span className="studio-option__specLabel">TDP</span>
          <strong>{watts}W</strong>
        </span>
        <span className="studio-option__spec">
          <span className="studio-option__specLabel">Δ Price</span>
          <strong
            className={
              row.deltaCents > 0
                ? 'studio-delta--up'
                : row.deltaCents < 0
                  ? 'studio-delta--down'
                  : undefined
            }
          >
            {deltaCentsLabel(row.deltaCents)}
          </strong>
        </span>
        <span className="studio-option__spec">
          <span className="studio-option__specLabel">Δ Power</span>
          <strong
            className={
              row.deltaWatts > 0
                ? 'studio-delta--danger'
                : row.deltaWatts < 0
                  ? 'studio-delta--down'
                  : undefined
            }
          >
            {deltaWattsLabel(row.deltaWatts)}
          </strong>
        </span>
      </span>

      {row.excludedReason && (
        <span className="studio-option__reason">{row.excludedReason}</span>
      )}
      {!row.inStock && <span className="studio-option__oos">Out of stock</span>}

      <span className="studio-option__foot">
        <span className={`studio-option__cta${row.selected ? ' studio-option__cta--on' : ''}`}>
          {row.selected ? (
            <>
              <Check size={13} aria-hidden="true" />
              Installed
            </>
          ) : (
            'Select & install'
          )}
        </span>
      </span>
    </button>
  )
}
