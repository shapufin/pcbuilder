'use client'

import { useId } from 'react'

interface Props {
  query: string
  brand: string | null
  brands: string[]
  onQuery: (query: string) => void
  onBrand: (brand: string | null) => void
}

export function OptionsFilterBar({ query, brand, brands, onQuery, onBrand }: Props) {
  const dirty = query.trim().length > 0 || brand !== null
  // Mounted twice on mobile (inline bar + FilterDrawer copy) — a stable
  // hardcoded id would duplicate; useId keeps each mount's label↔input pair.
  const searchId = `option-search${useId()}`
  return (
    <div className="filter-bar">
      <div className="field field--grow">
        <label htmlFor={searchId}>Search</label>
        <input
          id={searchId}
          type="search"
          placeholder="Search parts…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>
      {brands.map((b) => (
        <button
          key={b}
          type="button"
          className="chip"
          aria-pressed={brand === b}
          onClick={() => onBrand(brand === b ? null : b)}
        >
          {b}
        </button>
      ))}
      {dirty && (
        <button
          type="button"
          className="chip"
          onClick={() => {
            onQuery('')
            onBrand(null)
          }}
        >
          Reset filters
        </button>
      )}
    </div>
  )
}
