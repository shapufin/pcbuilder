'use client'

import { Bookmark, Euro } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import { priceCentsOf } from './studio-lib'
import { DeployCta } from './DeployCta'

/**
 * Rig investment (port of BuildPriceCard.tsx): real total from
 * state.totalCents + per-category breakdown from the picks. Save Rig →
 * actions.saveToAccount() with label/disabled from the provider's
 * actionStatus; Deploy → DeployCta → DeployModal (P4).
 */
export function BuildPriceCard({ onOpenDeploy }: { onOpenDeploy: () => void }) {
  const { state, actions, meta } = useBuilder()
  const { categories, selections, totalCents, actionStatus, savedBuild } = state

  const rows = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      cents: (selections[category.id] ?? [])
        .map((id) => meta.entryOf(id))
        .reduce((sum, e) => sum + priceCentsOf(e), 0),
      count: (selections[category.id] ?? []).length,
    }))
    .filter((r) => r.count > 0)

  const saveLabel =
    actionStatus.saveState === 'saving'
      ? 'Saving…'
      : actionStatus.saveView === 'saved'
        ? 'Saved ✓'
        : actionStatus.saveView === 'error'
          ? 'Save failed — retry'
          : savedBuild
            ? 'Save to account'
            : 'Save Rig'
  const saveDisabled = actionStatus.saveState === 'saving' || actionStatus.saveView === 'saved'

  return (
    <div className="studio-card">
      <div className="studio-card__head">
        <div className="studio-card__title">
          <span className="studio-card__icon">
            <Euro size={14} aria-hidden="true" />
          </span>
          <span>Rig Investment</span>
        </div>
        <span className="studio-card__chip">
          {rows.length} of {categories.length} slots
        </span>
      </div>

      <div className="studio-card__row">
        <div className="studio-price__total">
          <span className="studio-card__unit">Total spec cost</span>
          <span className="studio-card__big">{formatEUR(totalCents)}</span>
        </div>
        <div className="studio-price__actions">
          <button
            type="button"
            className={`studio-save${actionStatus.saveView === 'saved' ? ' studio-save--saved' : ''}${actionStatus.saveView === 'error' ? ' studio-save--error' : ''}`}
            disabled={saveDisabled}
            onClick={() => void actions.saveToAccount()}
          >
            <Bookmark size={13} aria-hidden="true" />
            {saveLabel}
          </button>
          <DeployCta onDeploy={onOpenDeploy} />
        </div>
      </div>

      {rows.length > 0 && (
        <ul className="studio-price__rows" aria-label="Per-slot breakdown">
          {rows.map((row) => (
            <li key={row.id} className="studio-price__row">
              <span className="studio-price__cat">
                {row.name}
                {row.count > 1 ? ` ×${row.count}` : ''}
              </span>
              <span className="studio-price__cents">{formatEUR(row.cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
