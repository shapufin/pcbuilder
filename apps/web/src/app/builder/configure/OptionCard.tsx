'use client'

import type { ComponentSpecEntry } from '@buildmyrig/lib'
import { formatEUR } from '@/components/ui/Price'

const prettyKey = (key: string): string => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

interface Props {
  entry: ComponentSpecEntry
  selected: boolean
  excludedReason: string | null
  warned: boolean
  onToggle: () => void
}

export function OptionCard({ entry, selected, excludedReason, warned, onToggle }: Props) {
  const excluded = Boolean(excludedReason)
  const typed = Object.entries(entry.specs).filter(
    ([, value]) => value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0),
  )
  const cosmetic = Object.entries(entry.display?.specs ?? {}).filter(
    ([key]) => !typed.some(([typedKey]) => typedKey === key),
  )
  const specs = [...typed, ...cosmetic].slice(0, 6)
  const label = `${entry.display?.name ?? entry.id} — ${formatEUR(entry.priceCents)}${selected ? ', selected' : ''}${
    excluded ? ', incompatible' : ''
  }`

  return (
    <button
      type="button"
      className={`option-card${selected ? ' option-card--selected' : ''}${excluded ? ' option-card--excluded' : ''}`}
      aria-pressed={selected}
      aria-disabled={excluded}
      title={excluded ? excludedReason ?? undefined : undefined}
      onClick={() => {
        if (!excluded) onToggle()
      }}
      aria-label={label}
    >
      <span className="option-top">
        {entry.display?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.display.image} alt="" />
        ) : null}
        <span className="option-meta">
          <span className="option-name">{entry.display?.name ?? entry.id}</span>
          {entry.display?.brand && <span className="option-brand">{entry.display.brand}</span>}
        </span>
        <span className="option-price">{formatEUR(entry.priceCents)}</span>
      </span>

      {specs.length > 0 && (
        <span className="spec-chips">
          {specs.map(([key, value]) => (
            <span className="spec-chip" key={key}>
              {prettyKey(key)}: {Array.isArray(value) ? value.join(', ') : String(value)}
            </span>
          ))}
        </span>
      )}

      <span className="option-flags">
        {selected && <span className="badge badge--selected">Selected</span>}
        {warned && !excluded && <span className="badge badge--warning">Heads-up</span>}
        {excluded && <span className="option-reason">{excludedReason}</span>}
      </span>
    </button>
  )
}
