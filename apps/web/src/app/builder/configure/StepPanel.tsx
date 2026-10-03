'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { BuilderIndex, ComponentSpecEntry } from '@buildmyrig/lib'
import { OptionsFilterBar } from './OptionsFilterBar'
import { OptionCard } from './OptionCard'
import { formatEUR } from '@/components/ui/Price'

type Category = BuilderIndex['categories'][number]

interface Props {
  category: Category
  options: ComponentSpecEntry[]
  totalOptions: number
  selectedIds: string[]
  selectedEntries: ComponentSpecEntry[]
  excluded: Map<string, string>
  warnedIds: Set<string>
  query: string
  brand: string | null
  brands: string[]
  onQuery: (query: string) => void
  onBrand: (brand: string | null) => void
  onToggle: (componentId: string) => void
  onRemove: (categoryId: string, componentId: string) => void
  onClearSlot: () => void
  onPrev: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

export function StepPanel(props: Props) {
  const {
    category,
    options,
    totalOptions,
    selectedIds,
    selectedEntries,
    excluded,
    warnedIds,
    query,
    brand,
    brands,
    onQuery,
    onBrand,
    onToggle,
    onRemove,
    onClearSlot,
    onPrev,
    onNext,
    isFirst,
    isLast,
  } = props

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={category.id}
        className="panel"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        aria-labelledby="step-title"
      >
        <header className="panel-header">
          <h1 id="step-title">{category.name}</h1>
          <span className="helper">
            {category.helperText ?? (category.required ? 'Required step' : 'Optional step')}
            {category.maxSelectable > 1 ? ` · choose up to ${category.maxSelectable}` : ''}
          </span>
        </header>

        {selectedEntries.length > 0 && (
          <div className="selection-list">
            {selectedEntries.map((entry) => (
              <div className="current-selection" key={entry.id}>
                {entry.display?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.display.image} alt="" />
                ) : null}
                <div className="meta">
                  <strong>{entry.display?.name ?? entry.id}</strong>
                  <span>{formatEUR(entry.priceCents)}</span>
                </div>
                <div className="current-selection__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => onRemove(category.id, entry.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div>
              <button type="button" className="btn btn--ghost" onClick={onClearSlot}>
                Clear slot
              </button>
            </div>
          </div>
        )}

        <OptionsFilterBar query={query} brand={brand} brands={brands} onQuery={onQuery} onBrand={onBrand} />

        {options.length === 0 ? (
          <p className="state-msg">
            {totalOptions === 0
              ? 'No parts in this slot yet.'
              : 'No parts match these filters.'}
            {totalOptions > 0 && (
              <>
                {' '}
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    onQuery('')
                    onBrand(null)
                  }}
                >
                  Reset filters
                </button>
              </>
            )}
          </p>
        ) : (
          <div className="options-grid">
            {options.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
              >
                <OptionCard
                  entry={entry}
                  selected={selectedIds.includes(entry.id)}
                  excludedReason={excluded.get(entry.id) ?? null}
                  warned={warnedIds.has(entry.id)}
                  onToggle={() => onToggle(entry.id)}
                />
              </motion.div>
            ))}
          </div>
        )}

        <footer className="step-panel__footer">
          <button type="button" className="btn" onClick={onPrev} disabled={isFirst}>
            Back
          </button>
          <button type="button" className="btn btn--primary" onClick={onNext} disabled={isLast}>
            {isLast ? 'Last step' : 'Next step'}
          </button>
        </footer>
      </motion.section>
    </AnimatePresence>
  )
}
