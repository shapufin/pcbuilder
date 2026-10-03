import type { Where } from 'payload'
import { formatEUR } from '@/components/ui/Price'

export const formatPrice = (product: { priceInEUR?: number | null }): string => formatEUR(product.priceInEUR ?? 0)

export const productFilters = (searchParams: Record<string, string | string[] | undefined>): {
  and: Where[]
  sort: string
  page: number
} => {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const and: Where[] = []
  const brand = first(searchParams.brand)
  if (brand) and.push({ 'brand.slug': { equals: brand } } as Where)
  const priceGte = Number(first(searchParams.price_gte))
  if (Number.isFinite(priceGte) && first(searchParams.price_gte)) and.push({ priceInEUR: { gte: priceGte } } as Where)
  const priceLte = Number(first(searchParams.price_lte))
  if (Number.isFinite(priceLte) && first(searchParams.price_lte)) and.push({ priceInEUR: { lte: priceLte } } as Where)
  const sortMap: Record<string, string> = {
    price_desc: '-priceInEUR',
    title: 'title',
    newest: '-createdAt',
  }
  const sort = sortMap[first(searchParams.sort) ?? ''] ?? 'priceInEUR'
  // Clamp to a positive integer — `?page=-5` or `?page=2.9` must not reach the DB.
  const page = Math.max(1, Math.floor(Number(first(searchParams.page)) || 1))
  return { and, sort, page }
}
