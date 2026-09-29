import { randomBytes } from 'crypto'
import { APIError } from 'payload'
import type { Payload } from 'payload'
import {
  createRuleEngine,
  type BuilderIndex,
  type ResolvedLine,
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
    selections[slot.categoryId] = [...slot.componentIds]
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
      validationSnapshot: { errors: [], warnings, rulesVersion: index.rulesVersion },
      status: 'addedToCart',
    } as never,
  })

  return {
    price,
    subItems: componentIds.map((componentId) => ({ componentId, quantity: 1 })),
    fulfillmentUnits: componentIds.length,
  }
}
