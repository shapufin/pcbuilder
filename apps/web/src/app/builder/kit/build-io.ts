import type { BuilderIndex, Selections } from '@buildmyrig/lib'
import { formatEUR } from '@/components/ui/Price'
import type { TemplateSlot } from '../builder-store'

/**
 * Design kit (entry 50 P2) — I/O del build in forma pura: manifest leggibile
 * per il Deploy, serializzazione/export e import validato.
 * Le selezioni dello store sono keyate per categoryId; l'export usa gli slug
 * di categoria (leggibili) ma i componentIds restano id del DB — il round-trip
 * vale nello stesso ambiente; la portabilità cross-env richiederebbe slug di
 * componente (backlog — entry-55 review).
 */

export interface BuildSlot {
  categoryId: string
  componentIds: string[]
}

export interface SerializedBuild {
  name?: string
  slots: { categorySlug: string; componentIds: string[] }[]
  rgbColor?: string
}

export type ParsedBuild =
  | { name?: string; slots: TemplateSlot[]; rgbColor?: string }
  | { error: string }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/** Righe leggibili per il manifest del Deploy (reali: parti, prezzi, watt, totale). */
export const buildManifest = (args: {
  name?: string
  slots: BuildSlot[]
  index: BuilderIndex
  totalCents: number
  recommendedPsuWatts?: number
  shareUrl?: string
}): string[] => {
  const { name, slots, index, totalCents, recommendedPsuWatts, shareUrl } = args
  const lines: string[] = [name ? `Build: ${name}` : 'Build: custom configuration']
  const componentById = new Map(index.components.map((c) => [c.id, c]))
  const categoryById = new Map(index.categories.map((c) => [c.id, c]))

  for (const slot of slots) {
    const category = categoryById.get(slot.categoryId)
    for (const id of slot.componentIds) {
      const entry = componentById.get(id)
      if (!entry) continue
      const label = category?.name ?? slot.categoryId
      const watts = typeof entry.specs.tdpWatts === 'number' ? ` · ${entry.specs.tdpWatts} W` : ''
      lines.push(`${label}: ${entry.display?.name ?? entry.id} — ${formatEUR(entry.priceCents)}${watts}`)
    }
  }
  if (typeof recommendedPsuWatts === 'number') {
    lines.push(`Estimated power: ${recommendedPsuWatts} W`)
  }
  lines.push(`Components total: ${formatEUR(totalCents)}`)
  if (shareUrl) lines.push(`Share link: ${shareUrl}`)
  return lines
}

/** Serializza la bozza per l'export (JSON-safe, slug al posto degli id). */
export const serializeBuild = (args: {
  selections: Selections
  index: BuilderIndex
  name?: string
  rgbColor?: string
}): SerializedBuild => {
  const { selections, index, name, rgbColor } = args
  const slugById = new Map(index.categories.map((c) => [c.id, c.slug]))
  const slots: SerializedBuild['slots'] = []
  for (const [categoryId, componentIds] of Object.entries(selections)) {
    const categorySlug = slugById.get(categoryId)
    if (!categorySlug || componentIds.length === 0) continue
    slots.push({ categorySlug, componentIds: [...componentIds] })
  }
  const out: SerializedBuild = { slots }
  if (name) out.name = name
  if (rgbColor) out.rgbColor = rgbColor
  return out
}

/**
 * Parse + validazione dell'import: slugs→ids e componenti devono esistere
 * nell'index (e appartenere alla categoria). rgbColor mancante o invalido è
 * tollerato (undefined, non errore) — l'import di una build vecchia o
 * manomessa non deve fallire per un campo cosmetico.
 */
export const parseBuildJson = (json: unknown, index: BuilderIndex): ParsedBuild => {
  let doc: unknown = json
  if (typeof json === 'string') {
    try {
      doc = JSON.parse(json)
    } catch {
      return { error: 'Invalid JSON' }
    }
  }
  if (!isRecord(doc)) return { error: 'Unrecognized build format' }
  if (!Array.isArray(doc.slots)) return { error: 'Missing the slot list' }

  const categoryBySlug = new Map(index.categories.map((c) => [c.slug, c]))
  const componentById = new Map(index.components.map((c) => [c.id, c]))
  const slots: TemplateSlot[] = []

  for (const raw of doc.slots) {
    if (!isRecord(raw) || typeof raw.categorySlug !== 'string' || !Array.isArray(raw.componentIds)) {
      return { error: 'Malformed slot (expected {categorySlug, componentIds[]})' }
    }
    const category = categoryBySlug.get(raw.categorySlug)
    if (!category) return { error: `Unknown slot: ${raw.categorySlug}` }
    for (const componentId of raw.componentIds) {
      const entry = typeof componentId === 'string' ? componentById.get(componentId) : undefined
      if (!entry) return { error: `Unknown component: ${String(componentId)}` }
      if (entry.categoryId !== category.id) {
        return { error: `${componentId} does not belong to slot ${raw.categorySlug}` }
      }
      slots.push({ categoryId: category.id, componentId })
    }
  }

  const out: { name?: string; slots: TemplateSlot[]; rgbColor?: string } = { slots }
  if (typeof doc.name === 'string' && doc.name) out.name = doc.name
  if (typeof doc.rgbColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(doc.rgbColor)) {
    out.rgbColor = doc.rgbColor
  }
  return out
}
