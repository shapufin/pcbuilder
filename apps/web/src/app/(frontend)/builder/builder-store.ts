import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_RGB_ACCENT } from '@buildmyrig/lib'

/** Draft persisted in localStorage so a half-finished build survives a refresh (07-ux-plan §2). */

export interface TemplateSlot {
  categoryId: string
  componentId: string
}

export type BuilderMode = 'scratch' | 'guided' | 'template'

interface BuilderState {
  mode: BuilderMode
  templateId: string | null
  /** server-persisted draft (POST /api/builder/builds) — set by the summary CTAs */
  buildId: string | null
  shareId: string | null
  /** Nome del draft salvato — usato per la riga carrello composita. */
  buildName: string | null
  /** categoryId -> componentIds (multi-select slots keep order) */
  selections: Record<string, string[]>
  /** RGB accent scelto dall'utente (cosmetico — hex-6 validato). */
  rgbColor: string
  /** Active platform path ('amd'/'intel', null = no preference). Provider clears
   *  the bound slots on switch — this setter is the raw state only. */
  path: 'amd' | 'intel' | null
  setPath: (path: 'amd' | 'intel' | null) => void
  stepIndex: number
  query: string
  brand: string | null
  startFresh: (mode?: BuilderMode) => void
  applyTemplate: (templateId: string, slots: TemplateSlot[], mode?: BuilderMode, rgbColor?: string) => void
  setRgbColor: (hex: string) => void
  saveBuild: (buildId: string, shareId: string, name?: string) => void
  clearSavedBuild: () => void
  /** Drop selections the index no longer serves (deleted/renamed components). */
  pruneUnknown: (validIds: ReadonlySet<string>) => void
  goToStep: (index: number) => void
  nextStep: (lastIndex: number) => void
  prevStep: () => void
  toggleSelect: (categoryId: string, componentId: string, maxSelectable: number) => void
  removeComponent: (categoryId: string, componentId: string) => void
  clearSlot: (categoryId: string) => void
  setQuery: (query: string) => void
  setBrand: (brand: string | null) => void
}

/** Campi che entrano nel draft persistito (localStorage). */
const sanitizeSelections = (v: unknown): Record<string, string[]> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {}
  const out: Record<string, string[]> = {}
  for (const [categoryId, ids] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(ids)) continue
    const clean = ids.filter((i): i is string => typeof i === 'string')
    if (clean.length > 0) out[categoryId] = clean
  }
  return out
}

/**
 * Persist merge — a tampered/legacy draft is sanitized field-by-field:
 * selections must be Record<string, string[]> (a malformed value would
 * crash pruneUnknown on every mount), rgbColor must be hex-6 (it would
 * otherwise 422 every save and leak into style={--rgb-accent}), and the
 * scalar fields are type-checked instead of blind-spread. If sanitizing
 * dropped selections, the saved refs are cleared too — they describe a
 * draft that no longer exists (#93 semantics).
 * Exported so tests exercise the exact rehydrate path.
 */
export const builderDraftMerge = (
  persisted: unknown,
  current: BuilderState,
): BuilderState => {
  const p = (typeof persisted === 'object' && persisted !== null ? persisted : {}) as Record<
    string,
    unknown
  >
  const selections = sanitizeSelections(p.selections)
  const selectionsIntact =
    p.selections === undefined || JSON.stringify(selections) === JSON.stringify(p.selections)
  return {
    ...current,
    mode: p.mode === 'guided' || p.mode === 'template' ? p.mode : 'scratch',
    templateId: typeof p.templateId === 'string' ? p.templateId : null,
    buildId: typeof p.buildId === 'string' || typeof p.buildId === 'number' ? String(p.buildId) : null,
    shareId: typeof p.shareId === 'string' ? p.shareId : null,
    buildName: typeof p.buildName === 'string' ? p.buildName : null,
    selections,
    rgbColor:
      typeof p.rgbColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(p.rgbColor)
        ? p.rgbColor
        : DEFAULT_RGB_ACCENT,
    stepIndex:
      typeof p.stepIndex === 'number' && Number.isInteger(p.stepIndex) && p.stepIndex >= 0
        ? p.stepIndex
        : 0,
    path: p.path === 'amd' || p.path === 'intel' ? p.path : null,
    ...(selectionsIntact ? {} : { buildId: null, shareId: null, buildName: null }),
  }
}

export const builderDraftPartialize = (s: BuilderState) => ({
  mode: s.mode,
  templateId: s.templateId,
  buildId: s.buildId,
  shareId: s.shareId,
  buildName: s.buildName,
  selections: s.selections,
  rgbColor: s.rgbColor,
  path: s.path,
  stepIndex: s.stepIndex,
})

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      mode: 'scratch',
      templateId: null,
      buildId: null,
      shareId: null,
      buildName: null,
      selections: {},
      rgbColor: DEFAULT_RGB_ACCENT,
      path: null,
      stepIndex: 0,
      query: '',
      brand: null,

      startFresh: (mode = 'scratch') =>
        set({ mode, templateId: null, buildId: null, shareId: null, buildName: null, selections: {}, rgbColor: DEFAULT_RGB_ACCENT, path: null, stepIndex: 0, query: '', brand: null }),

      applyTemplate: (templateId, slots, mode = 'template', rgbColor) => {
        const selections: Record<string, string[]> = {}
        for (const slot of slots) {
          if (!selections[slot.categoryId]) selections[slot.categoryId] = []
          if (!selections[slot.categoryId].includes(slot.componentId)) {
            selections[slot.categoryId].push(slot.componentId)
          }
        }
        // rgbColor absent → default: un template senza accento non deve
        // ereditare quello del template precedente (stale-accent bleed).
        set({
          mode, templateId, buildId: null, shareId: null, buildName: null, selections,
          rgbColor: rgbColor && /^#[0-9a-fA-F]{6}$/.test(rgbColor) ? rgbColor : DEFAULT_RGB_ACCENT,
          // path resets — the provider's applyTemplate action re-infers it
          // from the restored picks (mount-time draft restore uses the
          // once-guard inference effect instead).
          path: null,
          stepIndex: 0, query: '', brand: null,
        })
      },

      // Cosmetico: NON tocca buildId/shareId (#93 riguarda solo gli slot).
      setRgbColor: (hex) => {
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) set({ rgbColor: hex })
      },

      saveBuild: (buildId, shareId, name) => set({ buildId, shareId, buildName: name ?? null }),

      clearSavedBuild: () => set({ buildId: null, shareId: null, buildName: null }),

      pruneUnknown: (validIds) =>
        set((s) => {
          const next: Record<string, string[]> = {}
          let changed = false
          for (const [categoryId, ids] of Object.entries(s.selections)) {
            const kept = ids.filter((id) => validIds.has(id))
            if (kept.length !== ids.length) changed = true
            if (kept.length > 0) next[categoryId] = kept
          }
          // Phantom picks invalidated the saved ref just like a manual edit (#93).
          return changed ? { selections: next, buildId: null, shareId: null, buildName: null } : {}
        }),

      goToStep: (index) => set({ stepIndex: Math.max(0, index) }),
      nextStep: (lastIndex) => set((s) => ({ stepIndex: Math.min(lastIndex, s.stepIndex + 1) })),
      prevStep: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

      // Entry-15 review (#93): any selection change invalidates the
      // server-persisted draft — the summary CTAs (save/claim/add-to-cart)
      // must create a fresh build doc instead of reusing one whose slots no
      // longer match the current configuration.
      toggleSelect: (categoryId, componentId, maxSelectable) =>
        set((s) => {
          const current = s.selections[categoryId] ?? []
          const selected = current.includes(componentId)
          // A resolved cap of 0 (e.g. mobo m2Slots: 0 — a valid cap since
          // #366) means "no picks allowed": allow deselect, reject adds.
          if (maxSelectable < 1) {
            if (!selected) return {}
            return {
              buildId: null,
              shareId: null,
              buildName: null,
              selections: { ...s.selections, [categoryId]: [] },
            }
          }
          if (maxSelectable <= 1) {
            return {
              buildId: null,
              shareId: null,
              buildName: null,
              selections: { ...s.selections, [categoryId]: selected ? [] : [componentId] },
            }
          }
          if (selected) {
            return {
              buildId: null,
              shareId: null,
              buildName: null,
              selections: { ...s.selections, [categoryId]: current.filter((id) => id !== componentId) },
            }
          }
          const next = [...current, componentId]
          return {
            buildId: null,
            shareId: null,
            buildName: null,
            selections: {
              ...s.selections,
              [categoryId]: next.length > maxSelectable ? next.slice(next.length - maxSelectable) : next,
            },
          }
        }),

      removeComponent: (categoryId, componentId) =>
        set((s) => ({
          buildId: null,
          shareId: null,
          buildName: null,
          selections: {
            ...s.selections,
            [categoryId]: (s.selections[categoryId] ?? []).filter((id) => id !== componentId),
          },
        })),

      clearSlot: (categoryId) =>
        set((s) => ({
          buildId: null,
          shareId: null,
          buildName: null,
          selections: { ...s.selections, [categoryId]: [] },
        })),

      // Raw setter — path switches that must also clear bound picks go through
      // the provider's actions.setPath (resolves category ids → clearSlot).
      setPath: (path) => set({ path }),

      setQuery: (query) => set({ query }),
      setBrand: (brand) => set({ brand }),
    }),
    {
      name: 'buildmyrig-draft-v1',
      partialize: builderDraftPartialize,
      merge: builderDraftMerge,
    },
  ),
)
