'use client'

import React, { useEffect, useState } from 'react'
import { useForm, useFormFields } from '@payloadcms/ui'
import { resolveMegaMenu, type MegaMenuSection } from '../lib/mega-menu.ts'

type RawSection = {
  title?: unknown
  featuredPromo?: { image?: string | number | { id?: string | number } | null } | null
}

const mediaIdOf = (v: unknown): string | number | null => {
  if (typeof v === 'string' || typeof v === 'number') return v
  if (v && typeof v === 'object') {
    const id = (v as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return null
}

const panel: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150, #e5e7eb)',
  borderRadius: '8px',
  background: 'var(--theme-elevation-50, #fafafa)',
  padding: '1rem',
  margin: '0.5rem 0 1rem',
}
const column: React.CSSProperties = {
  background: 'var(--theme-elevation-0, #ffffff)',
  border: '1px solid var(--theme-elevation-100, #eeeeee)',
  borderRadius: '6px',
  padding: '0.75rem',
}
const chip: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '0.7rem',
  borderRadius: '4px',
  padding: '0.05rem 0.35rem',
  marginLeft: '0.35rem',
  background: 'var(--theme-elevation-100, #eeeeee)',
}

/**
 * Live preview of the Nexus mega-menu flyout (entry 73). Reads the *unsaved*
 * form state via `useForm().getDataByPath` and runs it through the real
 * `resolveMegaMenu` resolver — what renders here is what the storefront will
 * render, including dropped unsafe URLs, stripped unknown icons, and the
 * empty-sections → hidden-trigger contract. Promo image ids are resolved to
 * thumbnails via `/api/media/:id` (the stored value is an id, not a doc).
 */
export const MegaMenuPreview: React.FC = () => {
  const formSections = useFormFields(([fields]) => fields?.sections?.value as RawSection[] | undefined)
  const form = useForm()
  const raw =
    formSections ??
    (typeof form?.getDataByPath === 'function'
      ? (form.getDataByPath('sections') as RawSection[] | undefined)
      : undefined)
  const menu = resolveMegaMenu({ sections: raw })
  // resolveMegaMenu skips title-less rows — raw indexes must be filtered the
  // same way or a promo thumbnail would pair with the wrong section column.
  const titled = (raw ?? []).filter((s) => typeof s?.title === 'string' && s.title.trim())

  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const idsKey = titled
    .map((s) => mediaIdOf(s?.featuredPromo?.image))
    .filter((v): v is string | number => v != null)
    .join(',')

  useEffect(() => {
    if (!idsKey) return
    let cancelled = false
    for (const id of new Set(idsKey.split(','))) {
      fetch(`/api/media/${id}?depth=0`, { credentials: 'same-origin' })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((doc: { url?: unknown }) => {
          if (!cancelled && typeof doc.url === 'string' && doc.url) {
            setThumbs((t) => (t[id] ? t : { ...t, [id]: doc.url as string }))
          }
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
  }, [idsKey])

  const thumbFor = (section: MegaMenuSection, index: number): string =>
    thumbs[String(mediaIdOf(titled[index]?.featuredPromo?.image) ?? '')] ??
    section.featuredPromo?.imageUrl ??
    ''

  return (
    <div style={panel}>
      <strong>Flyout preview</strong>
      <span style={{ opacity: 0.6, marginLeft: '0.5rem', fontSize: '0.85rem' }}>
        reflects unsaved edits — sanitized exactly like the storefront
      </span>
      {menu.sections.length === 0 ? (
        <p style={{ marginTop: '0.75rem', opacity: 0.7 }}>
          {Array.isArray(raw)
            ? 'No sections — the mega-menu trigger stays hidden on the storefront.'
            : 'No saved sections — the storefront falls back to the default menu.'}
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
            gap: '0.75rem',
            marginTop: '0.75rem',
          }}
        >
          {menu.sections.map((section, i) => (
            <div key={i} style={column}>
              <div style={{ fontWeight: 600 }}>{section.title}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.55, marginBottom: '0.25rem' }}>
                {section.url}
              </div>
              {section.description && (
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                  {section.description}
                </div>
              )}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {section.items.map((item, j) => (
                  <li key={j} style={{ padding: '0.3rem 0', borderTop: '1px dashed var(--theme-elevation-100, #eeeeee)' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      {item.icon && <span style={chip}>{item.icon}</span>}
                      <strong>{item.label}</strong>
                      {item.badge && <span style={chip}>{item.badge}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      {item.subtitle ? `${item.subtitle} · ` : ''}
                      {item.url}
                    </div>
                  </li>
                ))}
              </ul>
              {section.featuredPromo && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    borderTop: '1px solid var(--theme-elevation-100, #eeeeee)',
                    paddingTop: '0.5rem',
                    fontSize: '0.8rem',
                  }}
                >
                  {thumbFor(section, i) ? (
                    <img
                      src={thumbFor(section, i)}
                      alt={section.featuredPromo.title}
                      style={{ maxWidth: '100%', maxHeight: '5rem', borderRadius: '4px', display: 'block', marginBottom: '0.4rem' }}
                    />
                  ) : (
                    <div
                      style={{
                        height: '3rem',
                        borderRadius: '4px',
                        background: 'var(--theme-elevation-100, #eeeeee)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        opacity: 0.6,
                        marginBottom: '0.4rem',
                      }}
                    >
                      promo image
                    </div>
                  )}
                  <strong>{section.featuredPromo.title}</strong>
                  <span style={chip}>promo</span>
                  <div style={{ opacity: 0.65 }}>{section.featuredPromo.description}</div>
                  <div style={{ opacity: 0.8, marginTop: '0.2rem' }}>
                    [{section.featuredPromo.buttonText}] → {section.featuredPromo.url}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MegaMenuPreview
