'use client'

import React from 'react'
import Image from 'next/image'
import { Link } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import { TableEntityCell } from '../ui/TableCompound'

// Subtitle candidates, in priority order — the mono code line under the title
// (SKU for catalog rows, slug for taxonomy, socket for PC components, etc.)
const SUBTITLE_FIELDS = ['sku', 'slug', 'socket', 'shareId', 'orderNumber']

const initials = (title: string): string => {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '·'
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const subtitleFor = (rowData: Record<string, unknown>, title: string): string | undefined => {
  for (const key of SUBTITLE_FIELDS) {
    const value = rowData?.[key]
    if (typeof value === 'string' && value !== '' && value !== title) {
      // Mock parity: SKU lines render as `SKU: ROG-STRIX-…`; other codes raw.
      return key === 'sku' ? `SKU: ${value}` : value
    }
  }
  const id = rowData?.id
  if (id != null) return `#${String(id)}`
  return undefined
}

// Media relations the list may carry (products.gallery, components.images) —
// only usable when the doc comes back populated (depth ≥ 1), i.e. an object
// with a URL; unresolved numeric ids render the monogram instead.
const thumbnailFor = (rowData: Record<string, unknown>): string | undefined => {
  for (const key of ['images', 'gallery']) {
    const list = rowData?.[key]
    if (!Array.isArray(list)) continue
    const first = list[0]
    if (first && typeof first === 'object') {
      const media = first as Record<string, unknown>
      const url = media.thumbnailURL ?? media.url
      if (typeof url === 'string' && url !== '') return url
    }
  }
  return undefined
}

/**
 * §5.4 entity cell for collection list tables — monogram avatar, bold title
 * and a monospace subtitle (SKU / slug / id). Mounted via
 * `admin.components.Cell` on each collection's title column; mirrors
 * `DefaultCell`'s link contract: `link` alone means "build the edit URL from
 * collectionSlug + rowData.id" (Payload only sets `linkURL` when the
 * collection configures `formatDocURL`), `viewType === 'trash'` links into
 * `/trash`, and `onClick` wins over linking (row-select drawers).
 */
export const EntityListCell = ({
  cellData,
  collectionSlug,
  link,
  linkURL,
  onClick,
  rowData,
  viewType,
}: DefaultCellComponentProps): React.JSX.Element => {
  const title = typeof cellData === 'string' && cellData !== '' ? cellData : 'Untitled'
  const data = (rowData as Record<string, unknown>) ?? {}
  const thumb = thumbnailFor(data)
  const cell = (
    <TableEntityCell
      avatar={thumb ? <Image src={thumb} alt="" width={32} height={32} unoptimized /> : undefined}
      initials={thumb ? undefined : initials(title)}
      title={title}
      subtitle={subtitleFor(data, title)}
    />
  )
  if (typeof onClick === 'function') {
    return (
      <button
        type="button"
        className="bmr-entity-cell-link"
        onClick={() => onClick({ cellData, collectionSlug, rowData })}
      >
        {cell}
      </button>
    )
  }
  if (link) {
    // `useConfig` is unavailable during Payload's server-side renderListView
    // pass, and the admin route is fixed — build the default edit URL the same
    // way DefaultCell does: /admin/collections/<slug>/<id> (trash-aware).
    const href =
      linkURL ??
      `/admin/collections/${collectionSlug}${viewType === 'trash' ? '/trash' : ''}/${encodeURIComponent(
        String(rowData?.id),
      )}`
    return (
      <Link href={href} prefetch={false} className="bmr-entity-cell-link">
        {cell}
      </Link>
    )
  }
  return cell
}
