'use client'

import React, { useEffect, useRef } from 'react'
import { FieldLabel, useField } from '@payloadcms/ui'

// Kept in sync with packages/plugin-shop/src/lib/slug.ts — the server-side
// beforeValidate hook is authoritative; this is only the live preview.
// (Cannot import from @buildmyrig/plugin-shop here: that barrel pulls the
// server-only plugin graph into the client bundle.)
const slugify = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Product `slug` field override — auto-generates the slug from `title` while
 * the field is untouched or still equals the last generated value. Any manual
 * edit marks the field touched and stops regeneration (clearing it manually
 * also stays untouched-by-us, per the user's explicit delete).
 *
 * The collection's `beforeValidate` hook applies the same slugify server-side,
 * so REST creates are covered even when this component never renders.
 */
export const SlugField: React.FC = () => {
  const { value: title } = useField<string>({ path: 'title' })
  const { value, setValue, showError, errorMessage } = useField<string>({ path: 'slug' })
  const touchedRef = useRef(false)
  const generatedRef = useRef('')

  const slug = typeof value === 'string' ? value : ''

  useEffect(() => {
    const next = slugify(title)
    if (!next) return
    if (!touchedRef.current || slug === generatedRef.current) {
      generatedRef.current = next
      if (slug !== next) setValue(next)
    }
  }, [title, slug, setValue])

  return (
    <div className={`field-type text${showError ? ' error' : ''}`}>
      <FieldLabel label="Slug" required path="slug" />
      <div className="field-type__wrap">
        <input
          type="text"
          id="field-slug"
          name="slug"
          value={slug}
          placeholder="e.g. asus-rog-strix-rtx-4080-super"
          aria-required="true"
          onChange={(e) => {
            touchedRef.current = true
            generatedRef.current = ''
            setValue(e.target.value)
          }}
        />
      </div>
      {showError && <div className="field-error">{errorMessage ?? 'Please enter a value'}</div>}
    </div>
  )
}

export default SlugField
