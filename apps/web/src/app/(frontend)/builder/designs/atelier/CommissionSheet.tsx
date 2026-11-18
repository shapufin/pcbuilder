'use client'

import Link from 'next/link'
import { ShieldCheck, ShoppingBag } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { ModalShell } from '../../kit/ModalShell'
import type { BuilderToast } from '../../kit/BuilderToasts'
import { psuRatedWatts } from '../../kit/part-lib'
import { powerReserve } from './atelier-lib'

/**
 * Atelier commission sheet (entry 131) — the mockup's "commission bespoke
 * rig" flow on the real pipeline: stage 1 runs the engine's
 * validateSelections, stage 2 shows the power envelope, then
 * actions.addToCart() (which saves the draft server-side and lets the server
 * recompute the price — the client never sends a total).
 */
export function CommissionSheet({
  onClose,
  onToast,
}: {
  onClose: () => void
  onToast: (message: string, kind?: BuilderToast['kind']) => void
}) {
  const { state, actions, meta } = useBuilder()
  const { missingRequired, result, totalCents, selections, index, actionStatus } = state
  const validation = meta.validateCurrent()
  const rated = psuRatedWatts(selections, index)
  const reserve = powerReserve(result.recommendedPsuWatts, rated)
  const busy = actionStatus.cartView === 'adding'
  const added = actionStatus.cartView === 'added'
  const blocked = validation.errors.length > 0 || missingRequired.length > 0

  const submit = async () => {
    const ok = await actions.addToCart()
    onToast(
      ok ? 'Build added to cart' : 'Could not add the build — check the configuration',
      ok ? 'success' : 'error',
    )
  }

  return (
    <ModalShell
      title="Commission bespoke rig"
      subtitle={`${formatEUR(totalCents)} · ${result.recommendedPsuWatts}W estimated draw`}
      icon={<ShieldCheck size={16} />}
      onClose={onClose}
      busy={busy}
    >
      <div className="atl-commission-body">
        {validation.errors.length > 0 ? (
          <ul className="atl-issues atl-issues--error">
            {validation.errors.map((issue, i) => (
              <li key={`${issue.ruleId}-${i}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}

        {missingRequired.length > 0 ? (
          <p className="atl-issues atl-issues--pending">
            {missingRequired.length} required slot{missingRequired.length === 1 ? '' : 's'} still
            empty — install every required part before commissioning.
          </p>
        ) : null}

        {validation.warnings.length > 0 ? (
          <ul className="atl-issues atl-issues--warn">
            {validation.warnings.map((issue, i) => (
              <li key={`${issue.ruleId}-${i}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}

        {!blocked ? (
          <p className="atl-issues atl-issues--ok">
            <ShieldCheck size={14} aria-hidden="true" /> Compatibility matrix passed. The server
            recomputes the price and re-validates the build when it lands in the cart.
          </p>
        ) : null}

        <div className="atl-reserve">
          <div className="atl-reserve__row">
            <span className="atl-reserve__label">Power envelope</span>
            <span className="atl-reserve__value">
              <strong>{result.recommendedPsuWatts}W</strong>
              <span>{rated !== null ? ` / ${rated}W` : ' / no PSU'}</span>
            </span>
          </div>
          <div className="atl-reserve__bar">
            <span
              className={`atl-reserve__fill atl-reserve__fill--${reserve.tone}`}
              style={{ width: `${reserve.loadPct ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="atl-sheet-foot atl-sheet-foot--actions">
        {added ? (
          <Link href="/cart" className="atl-cta atl-cta--wide">
            <ShoppingBag size={14} aria-hidden="true" /> View cart
          </Link>
        ) : (
          <button
            type="button"
            className="atl-cta atl-cta--wide"
            onClick={submit}
            disabled={blocked || busy}
          >
            {busy ? 'Commissioning…' : `Add build to cart · ${formatEUR(totalCents)}`}
          </button>
        )}
      </div>
    </ModalShell>
  )
}
