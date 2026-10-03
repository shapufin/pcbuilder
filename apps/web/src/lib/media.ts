/**
 * Media helpers — resolve a Payload upload doc (or relationship id) into
 * renderable <img> props. Products are fetched at depth>=1 so `gallery`
 * entries are Media docs; a bare id means the query forgot depth and yields
 * no image rather than a broken URL.
 */
export type MediaDoc = {
  alt?: string | null
  url?: string | null
  width?: number | null
  height?: number | null
  sizes?: Partial<
    Record<'thumb' | 'card' | 'gallery' | 'hero', { url?: string | null; width?: number | null; height?: number | null } | undefined>
  > | null
}

export type MediaSize = 'thumb' | 'card' | 'gallery' | 'hero'

export type MediaPick = { url: string; width: number; height: number; alt: string }

/** Configured imageSizes (media.ts) — intrinsic dims when the size exists. */
const SIZE_DIMS: Record<MediaSize, { width: number; height?: number }> = {
  thumb: { width: 240, height: 240 },
  card: { width: 600, height: 400 },
  gallery: { width: 1200 },
  hero: { width: 1920 },
}

export function mediaDoc(value: unknown): MediaDoc | null {
  return value != null && typeof value === 'object' ? (value as MediaDoc) : null
}

/**
 * Pick the best image candidate: requested size → original → any other size.
 * Returns null when nothing usable exists (caller renders the placeholder).
 */
export function pickMedia(
  media: MediaDoc | number | null | undefined,
  size: MediaSize,
  fallbackAlt: string,
): MediaPick | null {
  const doc = mediaDoc(media)
  if (!doc) return null
  const sized = doc.sizes?.[size]
  const url = sized?.url ?? doc.url ?? firstSizedUrl(doc.sizes)
  if (!url) return null
  const width = sized?.width ?? (sized ? undefined : doc.width) ?? SIZE_DIMS[size].width
  const height = sized?.height ?? (sized ? undefined : doc.height) ?? SIZE_DIMS[size].height ?? Math.round((width * 2) / 3)
  return { url, width, height, alt: doc.alt || fallbackAlt }
}

function firstSizedUrl(sizes: MediaDoc['sizes']): string | null {
  if (!sizes) return null
  for (const key of ['card', 'gallery', 'thumb', 'hero'] as const) {
    const url = sizes[key]?.url
    if (url) return url
  }
  return null
}
