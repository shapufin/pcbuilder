'use client'

interface Props {
  query: string
  brand: string | null
  brands: string[]
  onQuery: (query: string) => void
  onBrand: (brand: string | null) => void
}

export function OptionsFilterBar({ query, brand, brands, onQuery, onBrand }: Props) {
  const dirty = query.trim().length > 0 || brand !== null
  return (
    <div className="filter-bar">
      <div className="field" style={{ flex: '1 1 220px' }}>
        <label htmlFor="option-search">Search</label>
        <input
          id="option-search"
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
