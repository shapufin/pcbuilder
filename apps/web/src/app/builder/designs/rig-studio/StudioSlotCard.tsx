'use client'

import { ArrowRightLeft, X, type LucideIcon } from 'lucide-react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilder } from '../../builder-provider'
import {
  iconForCategory,
  priceCentsOf,
  slotCode,
  zoneForCategory,
  type StudioCategory,
  type StudioZone,
} from './studio-lib'

/** The icon arrives via prop: resolving a component by CallExpression and
 *  using it as a JSX tag trips react-hooks/static-components ("created
 *  during render") — destructuring from props is the supported pattern. */
export function SlotGlyph({ icon: Icon, size }: { icon: LucideIcon; size: number }) {
  return <Icon size={size} aria-hidden="true" />
}

/**
 * Bay slot card (port of the mockup's ComponentBay card): CAD code,
 * installed picks with remove, n/max counter, cappedBy chip, subtotal, and
 * the Swap CTA. Dashed "Pick a {name}" empty state. Hovering/focusing the
 * card reports its blueprint zone upward (bay → blueprint highlight).
 */
export function StudioSlotCard({
  category,
  onOpenSwap,
  onHoverZone,
}: {
  category: StudioCategory
  onOpenSwap: (categoryId: string) => void
  onHoverZone?: (zone: StudioZone | null) => void
}) {
  const { state, actions, meta } = useBuilder()

  const pickIds = state.selections[category.id] ?? []
  const picks = pickIds
    .map((id) => meta.entryOf(id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
  const firstPick = picks[0]
  const limit = state.limits[category.id]
  const max = limit?.max ?? category.maxSelectable
  const cappedBy = limit?.cappedBy
  const subtotal = picks.reduce((sum, e) => sum + priceCentsOf(e), 0)
  const zone = zoneForCategory(category.slug)

  return (
    <article
      className={`studio-slot${picks.length === 0 ? ' studio-slot--empty' : ''}`}
      data-zone={zone}
      onMouseEnter={zone && onHoverZone ? () => onHoverZone(zone) : undefined}
      onMouseLeave={zone && onHoverZone ? () => onHoverZone(null) : undefined}
      onFocus={zone && onHoverZone ? () => onHoverZone(zone) : undefined}
      onBlur={zone && onHoverZone ? () => onHoverZone(null) : undefined}
    >
      <div className="studio-slot__top">
        <span className="studio-slot__icon" aria-hidden="true">
          <SlotGlyph icon={iconForCategory(category.slug)} size={12} />
        </span>
        <span className="studio-slot__code">{slotCode(category, firstPick, 1)}</span>
        {category.required && <span className="studio-slot__req">Req</span>}
        {picks.length > 0 && (
          <span className="studio-slot__subtotal">{formatEUR(subtotal)}</span>
        )}
      </div>

      <h4 className="studio-slot__name">{category.name}</h4>

      {picks.length > 0 ? (
        <ul className="studio-picks">
          {picks.map((entry, i) => (
            <li className="studio-pick" key={entry.id}>
              <span className="studio-pick__idx" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="studio-pick__name">{entry.display?.name ?? entry.id}</span>
              <span className="studio-pick__price">{formatEUR(entry.priceCents)}</span>
              <button
                type="button"
                className="studio-pick__remove"
                aria-label={`Remove ${entry.display?.name ?? entry.id}`}
                onClick={() => actions.remove(category.id, entry.id)}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          className="studio-slot__placeholder"
          onClick={() => onOpenSwap(category.id)}
        >
          Pick a {category.name}
        </button>
      )}

      <div className="studio-slot__foot">
        <span className="studio-slot__count">
          {picks.length}/{max} installed
        </span>
        {cappedBy && (
          <span
            className="studio-slot__cap"
            title={`Cap ${max} from ${cappedBy.field} on ${cappedBy.componentName ?? cappedBy.componentId}`}
          >
            limited by {cappedBy.componentName ?? cappedBy.componentId}
          </span>
        )}
        <button
          type="button"
          className="studio-swap-btn"
          onClick={() => onOpenSwap(category.id)}
        >
          <ArrowRightLeft size={11} aria-hidden="true" />
          Swap
        </button>
      </div>
    </article>
  )
}
