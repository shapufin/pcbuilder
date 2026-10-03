'use client'

import Link from 'next/link'
import type { BuilderIndex, EngineResult } from '@buildmyrig/lib'
import { LivePrice } from './LivePrice'
import { WarningsPanel } from './WarningsPanel'

type Category = BuilderIndex['categories'][number]

interface Props {
  categories: Category[]
  index: BuilderIndex
  selections: Record<string, string[]>
  result: EngineResult
  totalCents: number
  canReview: boolean
  missingRequired: Category[]
  onSlotClick: (index: number) => void
  onRemoveComponent: (categoryId: string, componentId: string) => void
}

const nameOf = (index: BuilderIndex, id: string): string =>
  index.components.find((c) => c.id === id)?.display?.name ?? id

export function BuildRail({
  categories,
  index,
  selections,
  result,
  totalCents,
  canReview,
  missingRequired,
  onSlotClick,
  onRemoveComponent,
}: Props) {
  return (
    <aside className="rail" aria-label="Your build">
      <h2>Your build</h2>

      <div className="rail-slots">
        {categories.map((category, i) => {
          const ids = selections[category.id] ?? []
          if (ids.length === 0) {
            return (
              <button
                key={category.id}
                type="button"
                className="rail-slot rail-slot--empty"
                onClick={() => onSlotClick(i)}
              >
                <span className="slot-label">{category.name}</span>
                <span className="slot-name">Pick a {category.name.toLowerCase()}</span>
              </button>
            )
          }
          return (
            <div key={category.id} className="rail-slot">
              <button
                type="button"
                className="rail-slot-btn"
                onClick={() => onSlotClick(i)}
                aria-label={`Edit ${category.name} step`}
              >
                <span className="slot-label">{category.name}</span>
                <span className="slot-name">
                  {ids.map((id) => nameOf(index, id)).join(', ')}
                </span>
              </button>
              <span className="rail-slot-x-group">
                {ids.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="rail-slot-x"
                    aria-label={`Remove ${nameOf(index, id)}`}
                    onClick={() => onRemoveComponent(category.id, id)}
                  >
                    ×
                  </button>
                ))}
              </span>
            </div>
          )
        })}
      </div>

      <div className="rail-price">
        <span className="rail-price__label">Total</span>
        <LivePrice cents={totalCents} />
      </div>

      <div className="power-chip">Recommended PSU ≥ {result.recommendedPsuWatts} W</div>

      <WarningsPanel result={result} />

      {canReview ? (
        <Link href="/builder/summary" className="btn btn--primary btn--full">
          Review build
        </Link>
      ) : (
        <button type="button" className="btn btn--primary btn--full" disabled>
          Pick {missingRequired.map((c) => c.name).join(', ')} to continue
        </button>
      )}
    </aside>
  )
}
