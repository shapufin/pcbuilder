import type { BuilderIndex, ComponentSpecEntry, RuleCriticalSpec } from '@buildmyrig/lib'

/**
 * Platform paths (spec §C, entry 68) — "AMD build" / "Intel build" as a
 * first-filter workflow. Platform is DERIVED from typed specs (socket), never
 * a stored field: a new CPU picks its side the moment `socket` is filled.
 */

export type PlatformId = 'amd' | 'intel'

/** Socket → platform. New sockets extend here or via customSocketMap. */
export const SOCKET_PLATFORM: Record<string, PlatformId> = {
  AM4: 'amd',
  AM5: 'amd',
  sTR5: 'amd',
  sTRX4: 'amd',
  LGA1200: 'intel',
  LGA1700: 'intel',
  LGA1851: 'intel',
  LGA2066: 'intel',
}

/** Slots a path hard-filters and clears on switch (cpu/mobo/ram/cooling). */
export const PATH_BOUND_SLUGS = ['cpu', 'motherboard', 'ram', 'cooling'] as const

const uniq = <T>(list: T[]): T[] => [...new Set(list)]

/**
 * The platforms a component belongs to ([] = unconstrained — visible on every
 * path). cpu/motherboard follow their socket; cooling follows the union of its
 * coolerSocketSupport (a cooler that mounts both sockets appears on both
 * paths); everything else is platform-agnostic.
 */
export const platformsForComponent = (
  categorySlug: string,
  specs: RuleCriticalSpec,
  customSocketMap?: Record<string, PlatformId>,
): PlatformId[] => {
  const socketMap = customSocketMap ? { ...SOCKET_PLATFORM, ...customSocketMap } : SOCKET_PLATFORM
  if (categorySlug === 'cpu' || categorySlug === 'motherboard') {
    const p = specs.socket ? socketMap[specs.socket] : undefined
    return p ? [p] : []
  }
  if (categorySlug === 'cooling') {
    return uniq(
      (specs.coolerSocketSupport ?? [])
        .map((s) => socketMap[s])
        .filter((p): p is PlatformId => Boolean(p)),
    )
  }
  return []
}

export interface BuilderPath {
  id: PlatformId
  label: string
  sockets: string[]
}

/** Paths actually usable with this index's data — a platform with zero
 *  socket-bound parts hides itself rather than offering an empty funnel. */
export const builderPaths = (
  index: Pick<BuilderIndex, 'components' | 'categories'>,
  customSocketMap?: Record<string, PlatformId>,
): BuilderPath[] => {
  const socketMap = customSocketMap ? { ...SOCKET_PLATFORM, ...customSocketMap } : SOCKET_PLATFORM
  const byPlatform = new Map<PlatformId, Set<string>>()
  const slugById = new Map(index.categories.map((c) => [c.id, c.slug]))
  for (const c of index.components) {
    const slug = slugById.get(c.categoryId)
    if (slug !== 'cpu' && slug !== 'motherboard') continue
    const p = c.specs.socket ? socketMap[c.specs.socket] : undefined
    if (!p || !c.specs.socket) continue
    byPlatform.set(p, (byPlatform.get(p) ?? new Set()).add(c.specs.socket))
  }
  const paths: BuilderPath[] = []
  if (byPlatform.has('amd')) {
    paths.push({ id: 'amd', label: 'AMD', sockets: [...byPlatform.get('amd')!] })
  }
  if (byPlatform.has('intel')) {
    paths.push({ id: 'intel', label: 'Intel', sockets: [...byPlatform.get('intel')!] })
  }
  return paths
}

const slugOf = (index: BuilderIndex, categoryId: string): string | undefined =>
  index.categories.find((c) => c.id === categoryId)?.slug

/** ramTypes supported by at least one motherboard visible under `path`. */
const inPathRamTypes = (index: BuilderIndex, path: PlatformId): Set<string> => {
  const out = new Set<string>()
  for (const c of index.components) {
    if (slugOf(index, c.categoryId) !== 'motherboard') continue
    if (c.platforms?.length && !c.platforms.includes(path)) continue
    if (c.specs.ramType) out.add(c.specs.ramType)
  }
  return out
}

/**
 * Hard path filter (spec §C). cpu/motherboard/cooling bind via platforms; ram
 * binds through in-path motherboards' ramTypes (it has no socket of its own);
 * every other category is always visible — physical constraints still come
 * from the derived rules underneath.
 *
 * Curried so the provider builds the in-path ramTypes set ONCE per
 * (index, path) — `pathVisible` recomputed it for every ram option row.
 */
export const makePathVisible = (
  index: BuilderIndex,
  path: PlatformId | null,
): ((entry: ComponentSpecEntry) => boolean) => {
  const ramTypes = path ? inPathRamTypes(index, path) : null
  return (entry) => {
    if (!path) return true
    const slug = slugOf(index, entry.categoryId)
    if (slug === 'ram') {
      // No in-path board yet → nothing to bind to; don't hide stock.
      if (!ramTypes || ramTypes.size === 0) return true
      return entry.specs.ramType ? ramTypes.has(entry.specs.ramType) : true
    }
    if (!entry.platforms?.length) return true
    return entry.platforms.includes(path)
  }
}

export const pathVisible = (
  entry: ComponentSpecEntry,
  index: BuilderIndex,
  path: PlatformId | null,
): boolean => makePathVisible(index, path)(entry)

/**
 * Is `path` servable by this index — the stale-path guard (review M1): a
 * persisted draft can name a platform the catalog no longer offers, which
 * would filter every bound option out while PathSwitcher self-hides below
 * two platforms (a dead-end empty funnel). The provider clears such paths.
 */
export const pathIsOffered = (
  path: PlatformId | null,
  index: Pick<BuilderIndex, 'platforms'>,
): boolean => Boolean(path) && (index.platforms ?? []).some((p) => p.id === path)

/** Category ids a path switch must clear (the four bound slots). */
export const pathBoundCategoryIds = (categories: BuilderIndex['categories']): string[] =>
  categories.filter((c) => (PATH_BOUND_SLUGS as readonly string[]).includes(c.slug)).map((c) => c.id)

/** Infer the path from restored selections (share link / template / draft) —
 *  looks at the selected CPU's or motherboard's socket, post-index-load. */
export const inferPath = (
  selections: Record<string, string[]>,
  index: BuilderIndex,
): PlatformId | null => {
  for (const ids of Object.values(selections)) {
    for (const id of ids) {
      const entry = index.components.find((c) => c.id === id)
      const slug = entry ? slugOf(index, entry.categoryId) : undefined
      if (slug !== 'cpu' && slug !== 'motherboard') continue
      const p = entry?.specs.socket ? SOCKET_PLATFORM[entry.specs.socket] : undefined
      if (p) return p
    }
  }
  return null
}
