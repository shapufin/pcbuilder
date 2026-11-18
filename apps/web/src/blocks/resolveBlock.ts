import type { ComponentType } from 'react'
import { blockRegistry } from './registry'
import { NexusHero } from '../themes/nexus/blocks/NexusHero'
import { AetherHero } from '../themes/aether/blocks/AetherHero'

/**
 * Theme-aware block resolution.
 *
 * The registry maps one component per slug, so a theme pack used to add *new
 * block types* (`nexusHero`, `aetherHero`) instead of changing how a shared one
 * renders. That made content theme-bound: a page authored on Nexus kept its
 * Nexus hero after switching to Aether.
 *
 * Resolution order:
 *   1. a legacy pack-specific slug (`nexusHero`) keeps its own component, so
 *      existing content renders exactly as before;
 *   2. a shared slug (`hero`) may be overridden by the active pack;
 *   3. otherwise the shared registry wins.
 *
 * Only genuinely 1:1 blocks are overridable. Most theme blocks are distinct
 * features (aether's product lab is not a variant of nexus's product rail), so
 * forcing them into this map would promise portability the field sets do not
 * support.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockComponent = ComponentType<{ block: any }>

/** pack id (from the theme global) -> shared slug -> pack component. */
export const PACK_OVERRIDES: Record<string, Record<string, BlockComponent>> = {
  nexus: {
    hero: NexusHero as BlockComponent,
  },
  aether: {
    hero: AetherHero as BlockComponent,
  },
}

/**
 * Slugs that only ever render their own component (pack-specific features).
 * Kept registered so pages authored before this change keep working.
 */
export const LEGACY_ALIASES: Record<string, BlockComponent> = {
  nexusHero: NexusHero as BlockComponent,
  nexusCategoryMatrix: blockRegistry.nexusCategoryMatrix,
  nexusProductRail: blockRegistry.nexusProductRail,
  nexusSlotExplorer: blockRegistry.nexusSlotExplorer,
  aetherHero: AetherHero as BlockComponent,
  aetherProductLab: blockRegistry.aetherProductLab,
  aetherLookbook: blockRegistry.aetherLookbook,
  aetherTelemetryGrid: blockRegistry.aetherTelemetryGrid,
  aetherCalculator: blockRegistry.aetherCalculator,
  aetherLoopVisualizer: blockRegistry.aetherLoopVisualizer,
}

export const resolveBlockComponent = (
  slug: string | undefined | null,
  pack?: string | null,
): BlockComponent | null => {
  if (!slug) return null
  const legacy = LEGACY_ALIASES[slug]
  if (legacy) return legacy
  const override = pack ? PACK_OVERRIDES[pack]?.[slug] : undefined
  return override ?? blockRegistry[slug] ?? null
}
