'use client'

import { useState } from 'react'
import { Layers, Search } from 'lucide-react'
import { useBuilder } from '../../builder-provider'
import { StudioSlotCard } from './StudioSlotCard'
import type { StudioZone } from './studio-lib'

/**
 * Component bay (port of the mockup's ComponentBay.tsx): header + search and
 * the slot-card column. Search filters categories by name/slug AND by their
 * option names — matching a model keeps its slot visible.
 */
export function StudioBay({
  onOpenSwap,
  hoverZone,
  onHoverZone,
}: {
  onOpenSwap: (categoryId: string) => void
  /** Blueprint zone under the pointer/focus — slot cards with that data-zone
   *  light up via CSS ([data-hover-zone] + [data-zone], .is-hot). */
  hoverZone?: StudioZone | null
  /** Reverse direction: hovering/focusing a card highlights its zone. */
  onHoverZone?: (zone: StudioZone | null) => void
}) {
  const { state, meta } = useBuilder()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const visible = state.categories.filter((category) => {
    if (!q) return true
    if (category.name.toLowerCase().includes(q) || category.slug.toLowerCase().includes(q)) {
      return true
    }
    return meta
      .optionsFor(category.id)
      .some((option) => (option.display?.name ?? '').toLowerCase().includes(q))
  })

  const installed = state.categories.filter(
    (c) => (state.selections[c.id] ?? []).length > 0,
  ).length

  return (
    <section
      className="studio-bay"
      aria-label="Component bay"
      data-hover-zone={hoverZone ?? undefined}
    >
      <div className="studio-bay__head">
        <div className="studio-bay__title">
          <Layers size={14} aria-hidden="true" />
          <span>Component Bay</span>
        </div>
        <span className="studio-bay__installed">
          {installed} / {state.categories.length} installed
        </span>
      </div>

      <div className="studio-bay__search">
        <Search size={13} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search slot or model..."
          aria-label="Search slots or components"
        />
      </div>

      <div className="studio-bay__slots">
        {visible.map((category) => (
          <StudioSlotCard
            key={category.id}
            category={category}
            onOpenSwap={onOpenSwap}
            onHoverZone={onHoverZone}
          />
        ))}
        {visible.length === 0 && (
          <p className="studio-bay__noResults">No slot matches “{query.trim()}”.</p>
        )}
      </div>
    </section>
  )
}
