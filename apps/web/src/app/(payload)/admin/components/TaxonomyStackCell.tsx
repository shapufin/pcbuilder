'use client'

import React, { useEffect, useState } from 'react'
import type { DefaultCellComponentProps } from 'payload'

const relTitle = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const doc = value as Record<string, unknown>
  for (const key of ['title', 'name', 'label']) {
    const v = doc[key]
    if (typeof v === 'string' && v !== '') return v
  }
  return undefined
}

const rawId = (value: unknown): string | number | undefined =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined

type Doc = Record<string, unknown>

/**
 * Module-level doc cache — list queries run at depth 0 so relationship cells
 * receive raw ids. Rows share categories/brands, so one deduped fetch per
 * unique `slug:id` resolves the whole column (mirrors the batching Payload's
 * RelationshipProvider does for drawer tables, which isn't mounted on the
 * main list view).
 */
const docCache = new Map<string, Promise<Doc | null>>()

const fetchDoc = (slug: string, id: string | number): Promise<Doc | null> => {
  const key = `${slug}:${id}`
  let pending = docCache.get(key)
  if (!pending) {
    pending = fetch(`/api/${slug}/${id}?depth=0`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? (r.json() as Promise<Doc>) : null))
      .catch(() => null)
    docCache.set(key, pending)
  }
  return pending
}

/**
 * Mock-parity `CATEGORY & BRAND` stacked cell — primary line is the cell's own
 * relationship title (category), secondary line the sibling `brand` relation's
 * name. Populated docs (drawers, depth>0 contexts) render directly; raw ids are
 * resolved through the cache; missing relations render an em dash.
 */
export const TaxonomyStackCell = ({
  cellData,
  rowData,
  field,
}: DefaultCellComponentProps): React.JSX.Element => {
  const fieldRel = field && 'relationTo' in field ? field.relationTo : undefined
  const relationTo = (Array.isArray(fieldRel) ? fieldRel[0] : fieldRel) ?? 'categories'

  const data = (rowData as Record<string, unknown>) ?? {}
  const catId = rawId(cellData)
  const brandId = rawId(data.brand)

  const [resolved, setResolved] = useState<{ cat?: Doc | null; brand?: Doc | null }>({})

  useEffect(() => {
    let mounted = true
    if (catId != null) {
      void fetchDoc(relationTo, catId).then((doc) => {
        if (mounted && doc) setResolved((prev) => ({ ...prev, cat: doc }))
      })
    }
    if (brandId != null) {
      void fetchDoc('brands', brandId).then((doc) => {
        if (mounted && doc) setResolved((prev) => ({ ...prev, brand: doc }))
      })
    }
    return () => {
      mounted = false
    }
  }, [catId, brandId, relationTo])

  const primary = relTitle(cellData) ?? relTitle(resolved.cat) ?? '—'
  const secondary =
    relTitle(data.brand) ??
    relTitle(resolved.brand) ??
    (catId == null ? relTitle(data.category) : undefined)

  return (
    <span className="bmr-stack-cell">
      <span className="bmr-stack-cell__primary">{primary}</span>
      {secondary ? <span className="bmr-stack-cell__secondary">{secondary}</span> : null}
    </span>
  )
}
