'use client'

import React, { useSyncExternalStore } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

export interface SerpModel {
  title: string
  url: string
  description: string
}

const truncate = (s: string, max: number): string =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Pure SERP model — Google caps visible titles ~60 chars and descriptions
 * ~160; the breadcrumb URL uses the slug (or a slugified title fallback).
 */
export const serpPreviewFrom = (input: {
  title?: unknown
  slug?: unknown
  description?: unknown
}): SerpModel => {
  const title = typeof input.title === 'string' && input.title !== '' ? input.title : 'Untitled Product'
  const slug =
    typeof input.slug === 'string' && input.slug !== '' ? input.slug : slugify(title)
  const description =
    typeof input.description === 'string' && input.description !== ''
      ? input.description
      : 'Add a product overview to preview the search snippet.'
  return {
    title: truncate(title, 60),
    url: `https://buildmyrig.local/products/${slug}`,
    description: truncate(description, 160),
  }
}

const FIELD_IDS = ['title', 'slug', 'description'] as const

const readDomValue = (name: string): string | undefined =>
  (document.getElementById(`field-${name}`) as HTMLInputElement | HTMLTextAreaElement | null)
    ?.value || undefined

const subscribe = (onChange: () => void): (() => void) => {
  document.addEventListener('input', onChange, true)
  const observer = new MutationObserver(onChange)
  observer.observe(document.body, { childList: true, subtree: true })
  return () => {
    document.removeEventListener('input', onChange, true)
    observer.disconnect()
  }
}

const getDomSnapshot = (): string =>
  FIELD_IDS.map((name) => readDomValue(name) ?? '').join('')

/**
 * Mock-parity right-sidebar "Google SERP Preview" — live search-result card.
 * Sidebar `ui` fields render outside `FormFieldsContext` (useFormFields is
 * empty there and useField throws in the RSC pass), so values come from
 * `useDocumentInfo().data` for the saved doc plus a DOM subscription for
 * unsaved keystrokes — the title/slug/description inputs carry `#field-*` ids.
 */
export const SerpPreviewField = (): React.JSX.Element => {
  const info = useDocumentInfo() as { data?: Record<string, unknown> }
  const snapshot = useSyncExternalStore(subscribe, getDomSnapshot, () => '')
  const [domTitle, domSlug, domDescription] = snapshot.split('')

  const model = serpPreviewFrom({
    title: domTitle || info.data?.title,
    slug: domSlug || info.data?.slug,
    description: domDescription || info.data?.description,
  })

  return (
    <div className="bmr-serp-preview">
      <div className="bmr-serp-preview__label">Google Search Preview</div>
      <div className="bmr-serp-preview__card">
        <div className="bmr-serp-preview__url">{model.url}</div>
        <div className="bmr-serp-preview__title">{model.title}</div>
        <div className="bmr-serp-preview__desc">{model.description}</div>
      </div>
    </div>
  )
}
