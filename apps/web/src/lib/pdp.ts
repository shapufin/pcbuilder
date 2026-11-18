/**
 * Product detail page derivations (audit 2026-11-18 R2). ProductPage was one
 * 170-line server component (cyclomatic 36, untested); the pure parts live
 * here so they are unit-tested and the page reads as data loading + markup.
 */

export type ReviewView = {
  id: number | string
  rating: number
  title: string
  comment: string
  authorName: string
  isVerifiedBuyer: boolean
  createdAt: string
}

type Doc = Record<string, unknown>

/** Cross-sell relation → numeric ids (populated docs or raw ids). */
export const crossSellIds = (product: Doc): number[] => {
  const raw = product.crossSells
  if (!Array.isArray(raw)) return []
  return raw
    .map((cs) => (typeof cs === 'object' && cs ? (cs as { id?: unknown }).id : cs))
    .filter((id): id is number => typeof id === 'number')
}

/** No variants, or any variant with untracked (null) or positive inventory, means in stock. */
export const variantsInStock = (variants: Array<{ inventory?: number | null }>): boolean =>
  variants.length === 0 || variants.some((v) => v.inventory == null || v.inventory > 0)

export const pickerVariants = (variants: Doc[]) =>
  variants.map((v) => {
    const options = Array.isArray(v.options)
      ? (v.options
          .map((o) => (typeof o === 'object' && o !== null ? (o as { label?: string }).label : null))
          .filter(Boolean) as string[])
      : []
    return {
      id: v.id as number | string,
      label: options.length > 0 ? options.join(' / ') : (v.title as string | null | undefined) || 'Standard',
      priceInEUR: v.priceInEUR as number | null | undefined,
      inventory: v.inventory as number | null | undefined,
    }
  })

export const reviewItems = (docs: Doc[], enabled: boolean): ReviewView[] =>
  enabled
    ? docs.map((r) => ({
        id: r.id as number | string,
        rating: (r.rating as number | undefined) ?? 5,
        title: (r.title as string | undefined) ?? '',
        comment: (r.comment as string | undefined) ?? '',
        authorName: (r.authorName as string | undefined) ?? 'Verified Builder',
        isVerifiedBuyer: (r.verifiedPurchase as boolean | undefined) ?? false,
        createdAt: (r.createdAt as string | undefined) ?? new Date().toISOString(),
      }))
    : []

export const aggregateRating = (items: ReviewView[]): { ratingValue: number; reviewCount: number } | null =>
  items.length > 0
    ? { ratingValue: items.reduce((acc, r) => acc + r.rating, 0) / items.length, reviewCount: items.length }
    : null

const PRESET_BADGES: Record<string, string> = { hot: 'HOT', new: 'NEW', sale: 'SALE', bestseller: 'BESTSELLER' }

export const productBadge = (
  badgeType: string | null | undefined,
  customText?: string | null,
): { label: string; type: string } | null => {
  if (!badgeType || badgeType === 'none') return null
  const preset = PRESET_BADGES[badgeType]
  if (preset) return { label: preset, type: badgeType }
  if (badgeType === 'custom' && customText?.trim()) return { label: customText.trim(), type: 'custom' }
  return null
}
