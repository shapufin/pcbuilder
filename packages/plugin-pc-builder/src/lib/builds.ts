import { randomBytes } from 'crypto'
import { APIError } from 'payload'
import type { Payload } from 'payload'
import {
  createRuleEngine,
  resolveSlotLimits,
  type BuilderIndex,
  type ResolvedLine,
  type StockUnit,
  type Warning,
} from '@buildmyrig/lib'
import { getBuilderIndex } from './builder-index'

/**
 * Build save/share + composite line resolution (Phase 2e).
 * The client never sends a price — resolveLine re-resolves from current DB
 * variant prices on every cart/order write, so a tampered priceSnapshot is
 * overwritten, not trusted.
 */

export interface BuildSlot {
  categoryId: string
  componentIds: string[]
}

export const newShareId = (): string => randomBytes(12).toString('base64url')

export const slotsToSelections = (slots: BuildSlot[]): Record<string, string[]> => {
  const selections: Record<string, string[]> = {}
  for (const slot of slots) {
    selections[slot.categoryId] = [
      ...(selections[slot.categoryId] ?? []),
      ...slot.componentIds,
    ]
  }
  return selections
}

/** Σ current variant prices (cents) for the given component ids, from a fresh index. */
export const priceBuildFromIndex = (index: BuilderIndex, componentIds: string[]): number => {
  const priceOf = new Map(index.components.map((c) => [c.id, c.priceCents]))
  return componentIds.reduce((sum, id) => sum + (priceOf.get(id) ?? 0), 0)
}

/**
 * Pure guard against phantom slot references (unknown category, unknown
 * component, or a component filed under a different category). The rule
 * engine skips unknown ids silently — without this check they reach
 * payload.create and surface as a FOREIGN KEY 500 instead of a readable 422.
 */
export const findUnknownSlotRefs = (index: BuilderIndex, slots: BuildSlot[]): string[] => {
  const categoryIds = new Set(index.categories.map((c) => c.id))
  const componentById = new Map(index.components.map((c) => [c.id, c]))
  const reasons: string[] = []
  for (const slot of slots) {
    if (!categoryIds.has(slot.categoryId)) {
      reasons.push(`Unknown category "${slot.categoryId}"`)
      continue
    }
    for (const componentId of slot.componentIds) {
      const component = componentById.get(componentId)
      if (!component) {
        reasons.push(`Unknown component "${componentId}"`)
        continue
      }
      if (component.categoryId !== slot.categoryId) {
        const name = component.display?.name ?? componentId
        reasons.push(`Component "${name}" does not belong to this category`)
      }
    }
  }
  return reasons
}

/**
 * Completeness/shape rules the UI enforces visually but the server must own:
 * every `required` category filled, no slot above `maxSelectable`. Called at
 * build save (endpoint + collection hook) and again at cart resolution so an
 * incomplete or over-stuffed doc can never be ordered.
 */
export const findIncompleteSlotReasons = (index: BuilderIndex, slots: BuildSlot[]): string[] => {
  const reasons: string[] = []
  // Duplicate slot rows for the same category are summed — last-wins would let
  // two sub-max rows evade maxSelectable entirely.
  const filled = new Map<string, number>()
  for (const s of slots) {
    filled.set(s.categoryId, (filled.get(s.categoryId) ?? 0) + s.componentIds.length)
  }
  for (const category of index.categories) {
    const count = filled.get(category.id) ?? 0
    if (category.required && count === 0) {
      reasons.push(`Required slot "${category.name ?? category.slug}" is empty`)
    }
    if (count > category.maxSelectable) {
      reasons.push(
        `Slot "${category.name ?? category.slug}" allows max ${category.maxSelectable} component(s), got ${count}`,
      )
    }
  }
  return reasons
}

/**
 * Non-blocking over-cap surface (entry 50): spec-driven caps (mobo ramSlots /
 * m2Slots via resolveSlotLimits) are enforced client-side in every builder
 * design; the REST path can't hard-block them yet (server slot-count rules are
 * future work), so an over-cap build saves with these warnings in its
 * validationSnapshot instead of silently passing — Deploy surfaces them.
 */
export const findOverCapWarnings = (index: BuilderIndex, slots: BuildSlot[]): Warning[] => {
  const limits = resolveSlotLimits(index, slotsToSelections(slots))
  const nameOfCat = new Map(index.categories.map((c) => [c.id, c.name ?? c.slug]))
  // Same aggregation as findIncompleteSlotReasons — counts are per-category
  // totals so duplicate slot rows cannot evade the cap.
  const counts = new Map<string, number>()
  for (const s of slots) {
    counts.set(s.categoryId, (counts.get(s.categoryId) ?? 0) + s.componentIds.length)
  }
  const warnings: Warning[] = []
  for (const [categoryId, count] of counts) {
    const limit = limits[categoryId]
    if (!limit?.cappedBy || count <= limit.max) continue
    warnings.push({
      ruleId: `slot-cap:${limit.cappedBy.field}`,
      severity: 'warning',
      componentIdA: limit.cappedBy.componentId,
      componentIdB: null,
      message: `Slot "${nameOfCat.get(categoryId) ?? categoryId}" holds ${count} of ${limit.max} allowed by "${limit.cappedBy.componentName ?? limit.cappedBy.componentId}" (${limit.cappedBy.field})`,
    })
  }
  return warnings
}

const idOf = (v: unknown): string | null => {
  if (v && typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id)
  if (v === null || v === undefined) return null
  return String(v)
}

interface BuildDoc {
  id: string | number
  name?: string
  slots?: { category?: unknown; components?: unknown[] }[] | null
}

/** DB doc slots → engine BuildSlot shape (shared by resolveLine + collection hook). */
export const buildDocSlotsToBuildSlots = (
  slots: { category?: unknown; components?: unknown[] }[] | null | undefined,
): BuildSlot[] =>
  (slots ?? []).map((slot) => ({
    categoryId: idOf(slot.category) ?? '',
    componentIds: (slot.components ?? [])
      .map((c) => idOf(c))
      .filter((id): id is string => Boolean(id)),
  }))

/**
 * resolveLine for the 'configured-build' line type, registered by this plugin
 * and invoked by plugin-shop's cart totals + order validation hooks.
 * Throws (aborting the cart/order write) when the build is missing or incompatible.
 */
export const resolveConfiguredBuildLine = async (
  line: { configuredBuild?: unknown; quantity?: number },
  payload: Payload,
): Promise<ResolvedLine> => {
  const buildId = idOf(line.configuredBuild)
  if (!buildId) throw new APIError('Cart line is missing its configured build', 422)
  const build = (await payload.findByID({
    id: buildId,
    collection: 'configured-builds',
    depth: 1,
    overrideAccess: true,
  })) as BuildDoc | null
  if (!build) throw new APIError(`Configured build ${buildId} not found`, 422)

  const index = await getBuilderIndex(payload)
  const engine = createRuleEngine(index)
  const slots = buildDocSlotsToBuildSlots(build.slots)
  const unknown = findUnknownSlotRefs(index, slots)
  if (unknown.length > 0) {
    throw new APIError(
      `Build "${build.name ?? buildId}" references deleted parts: ${unknown.join('; ')}`,
      422,
    )
  }
  const incomplete = findIncompleteSlotReasons(index, slots)
  if (incomplete.length > 0) {
    throw new APIError(
      `Build "${build.name ?? buildId}" is incomplete: ${incomplete.join('; ')}`,
      422,
    )
  }
  const { errors, warnings } = engine.validateSelections(slotsToSelections(slots))
  if (errors.length > 0) {
    throw new APIError(
      `Build "${build.name ?? buildId}" is no longer compatible: ${errors.map((e) => e.message).join('; ')}`,
      422,
    )
  }

  const componentIds = slots.flatMap((s) => s.componentIds)
  const price = priceBuildFromIndex(index, componentIds)
  await payload.update({
    collection: 'configured-builds',
    id: build.id,
    overrideAccess: true,
    data: {
      priceSnapshot: price,
      validationSnapshot: {
        errors: [],
        warnings: [...warnings, ...findOverCapWarnings(index, slots)],
        rulesVersion: index.rulesVersion,
      },
      status: 'addedToCart',
    } as never,
  })

  return {
    price,
    subItems: componentIds.map((componentId) => ({ componentId, quantity: 1 })),
    fulfillmentUnits: componentIds.length,
  }
}

/**
 * resolveStockUnits for 'configured-build' — the cart/order line carries no
 * product/variant of its own, so settlement decrements each component's
 * productVariant instead. Uses the line's stored subItems first, falling back
 * to the build doc's slots for lines written before subItems were stored.
 * Components without a productVariant contribute nothing (nothing to pick).
 */
export const resolveConfiguredBuildStockUnits = async (
  line: { configuredBuild?: unknown; subItems?: unknown; [key: string]: unknown },
  payload: Payload,
): Promise<StockUnit[]> => {
  const subItems = Array.isArray(line.subItems) ? (line.subItems as { component?: unknown; quantity?: unknown }[]) : []
  let componentQuantities = subItems
    .map((s) => ({ componentId: idOf(s.component), quantity: typeof s.quantity === 'number' && s.quantity > 0 ? s.quantity : 1 }))
    .filter((s): s is { componentId: string; quantity: number } => Boolean(s.componentId))

  if (componentQuantities.length === 0 && line.configuredBuild != null) {
    const buildId = idOf(line.configuredBuild)
    const build = buildId
      ? ((await payload.findByID({
          id: buildId,
          collection: 'configured-builds',
          depth: 1,
          overrideAccess: true,
        })) as BuildDoc | null)
      : null
    if (build) {
      componentQuantities = buildDocSlotsToBuildSlots(build.slots)
        .flatMap((s) => s.componentIds)
        .map((componentId) => ({ componentId, quantity: 1 }))
    }
  }

  const units: StockUnit[] = []
  for (const { componentId, quantity } of componentQuantities) {
    const component = (await payload.findByID({
      id: componentId,
      collection: 'components',
      depth: 0,
      overrideAccess: true,
    })) as { productVariant?: unknown } | null
    const variantId = component ? idOf(component.productVariant) : null
    if (variantId) units.push({ variant: variantId, quantity })
  }
  return units
}
