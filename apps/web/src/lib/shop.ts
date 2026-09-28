import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Where } from 'payload'

export const getPayloadClient = async () => {
  const config = await configPromise
  return getPayload({ config })
}

const eur = (cents: number): string => `€${(cents / 100).toFixed(2)}`

export const formatPrice = (product: { priceInEUR?: number | null }): string => eur(product.priceInEUR ?? 0)

export const productFilters = (searchParams: Record<string, string | string[] | undefined>): {
  and: Where[]
  sort: string
  page: number
} => {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const and: Where[] = []
  const brand = first(searchParams.brand)
  if (brand) and.push({ 'brand.slug': { equals: brand } } as Where)
  const priceGte = first(searchParams.price_gte)
  if (priceGte) and.push({ priceInEUR: { gte: Number(priceGte) } } as Where)
  const priceLte = first(searchParams.price_lte)
  if (priceLte) and.push({ priceInEUR: { lte: Number(priceLte) } } as Where)
  const sort = first(searchParams.sort) === 'price_desc' ? '-priceInEUR' : 'priceInEUR'
  const page = Number(first(searchParams.page) ?? 1) || 1
  return { and, sort, page }
}
