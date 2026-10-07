'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'
import { specTemplateFor, type SpecFieldDef } from '../lib/spec-templates.ts'

type SpecsRecord = Record<string, unknown>

interface CategoryDoc {
  id: string | number
  slug: string
}

/**
 * Per-category spec form for `components.specsJson` (spec §A, entry 68).
 * Renders the category's known spec vocabulary as real inputs; values write
 * into the sibling `specsJson` JSON field on user edits only. Keys outside the
 * template render under "additional specs" so nothing is hidden or stripped.
 * The raw `specsJson` field stays available in the collapsed "Advanced" row.
 */
export const SpecFieldsField: React.FC = () => {
  const specsValue = useFormFields(
    ([fields]) => fields?.specsJson?.value as SpecsRecord | undefined,
  )
  const dispatchField = useFormFields(([, dispatch]) => dispatch)
  const categoryId = useFormFields(
    ([fields]) => fields?.category?.value as string | number | undefined,
  )
  const [slugById, setSlugById] = useState<Map<string, string> | null>(null)

  useEffect(() => {
    fetch('/api/component-categories?limit=100&depth=0', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: { docs?: CategoryDoc[] }) =>
        setSlugById(new Map((json.docs ?? []).map((d) => [String(d.id), d.slug]))),
      )
      .catch(() => setSlugById(new Map()))
  }, [])

  const specs: SpecsRecord =
    specsValue && typeof specsValue === 'object' && !Array.isArray(specsValue) ? specsValue : {}
  const slug = categoryId != null ? slugById?.get(String(categoryId)) : undefined
  const template = useMemo(() => (slug ? specTemplateFor(slug) : []), [slug])
  const extraKeys = Object.keys(specs).filter((k) => !template.some((f) => f.key === k))

  const write = (key: string, value: unknown) => {
    const next: SpecsRecord = { ...specs }
    if (value === undefined || value === '' || value === null) delete next[key]
    else next[key] = value
    if (typeof dispatchField === 'function') {
      dispatchField({
        type: 'UPDATE',
        path: 'specsJson',
        value: next,
      })
    }
  }

  const renderInput = (f: SpecFieldDef) => {
    const value = specs[f.key]
    switch (f.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value == null ? '' : String(value)}
            onChange={(e) =>
              write(f.key, e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        )
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => write(f.key, e.target.checked ? true : undefined)}
          />
        )
      case 'select':
        return (
          <select
            value={value == null ? '' : String(value)}
            onChange={(e) => write(f.key, e.target.value === '' ? undefined : e.target.value)}
          >
            <option value="">—</option>
            {(f.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )
      case 'multiselect': {
        const selected = Array.isArray(value) ? value.map(String) : []
        return (
          <div>
            {(f.options ?? []).map((o) => (
              <label key={o} style={{ display: 'inline-flex', gap: '0.25rem', marginRight: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={selected.includes(o)}
                  onChange={(e) =>
                    write(
                      f.key,
                      e.target.checked
                        ? [...selected, o]
                        : selected.filter((v) => v !== o).length
                          ? selected.filter((v) => v !== o)
                          : undefined,
                    )
                  }
                />
                {o}
              </label>
            ))}
          </div>
        )
      }
      default:
        return (
          <input
            type="text"
            value={value == null ? '' : String(value)}
            onChange={(e) => write(f.key, e.target.value === '' ? undefined : e.target.value)}
          />
        )
    }
  }

  return (
    <div style={{ padding: '0.5rem 0 1rem' }}>
      {categoryId == null && <p style={{ opacity: 0.6 }}>Pick a category to see its spec fields.</p>}
      {categoryId != null && slugById === null && (
        <p style={{ opacity: 0.6 }}>Loading spec template…</p>
      )}
      {categoryId != null && slug != null && template.length === 0 && (
        <p style={{ opacity: 0.6 }}>This category has no spec template — use the raw JSON below.</p>
      )}
      {template.map((f) => (
        <div key={f.key} style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem' }}>
            {f.label}
            {f.unit ? <span style={{ opacity: 0.6 }}> ({f.unit})</span> : null}
          </label>
          {renderInput(f)}
        </div>
      ))}
      {extraKeys.length > 0 && (
        <div style={{ marginTop: '0.75rem', opacity: 0.8 }}>
          <strong>Additional specs</strong> (not in the {slug ?? 'category'} template):{' '}
          {extraKeys.join(', ')} — edit via raw JSON.
        </div>
      )}
    </div>
  )
}
