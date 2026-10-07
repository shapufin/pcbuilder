'use client'

import { createContext, use, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import {
  createRuleEngine,
  resolveSlotLimits,
  resolvedMax,
  type BuilderIndex,
  type ComponentSpecEntry,
  type EngineResult,
  type Selections,
  type SelectionValidation,
  type SlotLimit,
} from '@buildmyrig/lib'
import { trackBeginBuilder } from '@/lib/analytics'
import {
  inferPath,
  makePathVisible,
  pathBoundCategoryIds,
  pathIsOffered,
  type PlatformId,
} from '@buildmyrig/plugin-pc-builder'
import { useBuilderIndex } from './useBuilderIndex'
import { useBuilderStore, type BuilderMode, type TemplateSlot } from './builder-store'
import { useBuildActions, type BuildActionStatus, type SavedBuild } from './kit/useBuildActions'
import { buildOptionRows, type OptionRow } from './kit/option-rows'
import type { ConfigureTemplate } from './configure/page'

type Category = BuilderIndex['categories'][number]

/**
 * Il "cervello" condiviso dei builder designs (entry 50 P2): index fetch,
 * hydration, motore, limiti e azioni di persistenza vivono QUI — un design è
 * pura presentazione e consuma useBuilder(). Aggiungere un design = una
 * entry nel registry + una cartella designs/<slug>/, mai un fork di questa
 * logica.
 */
export interface BuilderContextValue {
  state: {
    /** Ready only: il provider renderizza da solo loading/error/empty. */
    index: BuilderIndex
    /** Categorie ordinate per sortOrder. */
    categories: Category[]
    selections: Selections
    result: EngineResult
    /** Cap effettivi per categoria (spec-driven, es. mobo ramSlots). */
    limits: Record<string, SlotLimit>
    totalCents: number
    missingRequired: Category[]
    savedBuild: { buildId: string; shareId: string } | null
    rgbColor: string
    /** Active platform path (null = no preference). Drives the option filter. */
    path: PlatformId | null
    /** Per-action state machines from the provider's useBuildActions instance —
     *  designs render "Saving…"/"Added ✓" from these. Never re-instantiate
     *  useBuildActions inside a design: its states would desync from the
     *  context actions (the context action mutates THIS instance). */
    actionStatus: BuildActionStatus
  }
  actions: {
    /** toggleSelect col cap RISOLTO (limits ?? maxSelectable) — il punto
     *  in cui la regola condizionale vale per ogni design. */
    select: (categoryId: string, componentId: string) => void
    remove: (categoryId: string, componentId: string) => void
    clearSlot: (categoryId: string) => void
    /** Cosmetico — non invalida il draft salvato (#93). */
    setRgbColor: (hex: string) => void
    /** Switch/clear the platform path — a real switch clears the bound slots
     *  (cpu/motherboard/ram/cooling); designs confirm before calling. */
    setPath: (path: PlatformId | null) => void
    /**
     * Persist the draft server-side (POST /api/builder/builds) WITHOUT claiming
     * it — the deploy pipeline's manifest stage and guest saved-build refs.
     * Returns the saved ref or null on failure.
     */
    saveDraft: (name?: string) => Promise<SavedBuild | null>
    saveToAccount: (name?: string) => Promise<boolean>
    /** Resolves to true when the build actually landed in the cart. */
    addToCart: (from?: DOMRect) => Promise<boolean>
    /** Resolves to true only when a link actually reached the clipboard. */
    share: () => Promise<boolean>
    /** Drop the saved-draft refs (deleted server doc, manual invalidation). */
    clearSavedBuild: () => void
    /** Hydrate a doc's slots into the draft (saved-build Load, presets, import). */
    applyTemplate: (
      templateId: string,
      slots: TemplateSlot[],
      mode?: BuilderMode,
      rgbColor?: string,
    ) => void
    /** Ricarica la builder index dopo un errore. */
    retry: () => void
  }
  meta: {
    entryOf: (id: string) => ComponentSpecEntry | undefined
    optionsFor: (categoryId: string) => ComponentSpecEntry[]
    /** componentId → motivo esclusione, per lo slot indicato. */
    excludedFor: (categoryId: string) => Map<string, string>
    optionRows: (categoryId: string) => OptionRow[]
    /** Preset `build-templates` (SavedBuildsModal "Architect Presets"). */
    templates: ConfigureTemplate[]
    /** Platform paths usable with the live index (sockets present in data). */
    platforms: { id: string; label: string; sockets: string[] }[]
    /** engine.validateSelections on the CURRENT picks — deploy stage 1. */
    validateCurrent: () => SelectionValidation
  }
}

const BuilderContext = createContext<BuilderContextValue | null>(null)

/** React 19: use(Context) — niente useContext, niente forwardRef. */
export function useBuilder(): BuilderContextValue {
  const ctx = use(BuilderContext)
  if (!ctx) {
    throw new Error(
      'useBuilder() can only be called inside <BuilderProvider> — render builder designs via BuilderShell.',
    )
  }
  return ctx
}

const emptySubscribe = () => () => {}

export function BuilderProvider({
  template,
  templates,
  initialPath,
  children,
}: {
  template: ConfigureTemplate | null
  templates: ConfigureTemplate[]
  initialPath?: PlatformId | null
  children: React.ReactNode
}) {
  const { index, status, retry } = useBuilderIndex()
  // Hydration gate: false durante SSR, true sul client senza un setState
  // in effect (react-hooks/set-state-in-effect).
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const selections = useBuilderStore((s) => s.selections)
  const rgbColor = useBuilderStore((s) => s.rgbColor)
  // Primitive selectors — an inline object literal here would fail Object.is
  // on every store update and re-render the whole provider tree.
  const buildId = useBuilderStore((s) => s.buildId)
  const shareId = useBuilderStore((s) => s.shareId)
  const savedBuild = useMemo(
    () => (buildId && shareId ? { buildId, shareId } : null),
    [buildId, shareId],
  )
  const applyTemplate = useBuilderStore((s) => s.applyTemplate)
  const toggleSelect = useBuilderStore((s) => s.toggleSelect)
  const removeComponent = useBuilderStore((s) => s.removeComponent)
  const clearSlot = useBuilderStore((s) => s.clearSlot)
  const setRgbColor = useBuilderStore((s) => s.setRgbColor)
  const path = useBuilderStore((s) => s.path)
  const setPathRaw = useBuilderStore((s) => s.setPath)

  // ?template= / ?build= → idrata il draft (logica mossa da Configurator,
  // + ripristino rgbColor dal doc condiviso).
  useEffect(() => {
    if (!hydrated || !template) return
    const state = useBuilderStore.getState()
    const hasSelection = Object.values(state.selections).some((ids) => ids.length > 0)
    if (state.templateId !== template.id || !hasSelection) {
      applyTemplate(template.id, template.slots, undefined, template.rgbColor)
    }
  }, [hydrated, template, applyTemplate])

  // Funnel: one begin_builder per configurator session (audit gap P5-X3).
  const beganRef = useRef(false)
  useEffect(() => {
    if (!hydrated || beganRef.current) return
    beganRef.current = true
    trackBeginBuilder(template?.name)
  }, [hydrated, template])

  // ?path= from the landing cards — applied once, after the index resolves so
  // bound-slot clearing can resolve category ids. Engaging a path clears the
  // bound picks — same contract as actions.setPath (declared post-guard, so
  // this effect cannot reference it). A param naming a platform the index
  // can't serve is ignored outright — applying it would clear the draft picks
  // AND yield the dead-end funnel the stale-path guard exists to prevent.
  const pathParamApplied = useRef(false)
  useEffect(() => {
    if (!hydrated || !index || pathParamApplied.current) return
    pathParamApplied.current = true
    if (!initialPath || !pathIsOffered(initialPath, index)) return
    const state = useBuilderStore.getState()
    if (state.path === initialPath) return
    for (const catId of pathBoundCategoryIds(index.categories)) state.clearSlot(catId)
    state.setPath(initialPath)
  }, [hydrated, initialPath, index])

  // Stale-path guard (review M1): a persisted draft can name a platform the
  // live index no longer offers (last AM5 part deleted, fresh DB). pathVisible
  // would filter every bound option out while PathSwitcher self-hides below
  // two platforms — a dead-end empty funnel with no way back. Clearing only
  // widens the filter; picks are untouched. Runs before inference below so a
  // cleared draft can still derive a path from its remaining picks.
  useEffect(() => {
    if (!index) return
    const state = useBuilderStore.getState()
    if (state.path && !pathIsOffered(state.path, index)) state.setPath(null)
  }, [index])

  // Path inference (spec §C): when no ?path= was given and the draft/template/
  // share restore landed selections, derive the path from the picked CPU/mobo
  // socket — once, post-index. A later manual "No preference" stays manual.
  const pathInferred = useRef(false)
  useEffect(() => {
    if (!index || pathInferred.current) return
    pathInferred.current = true
    const state = useBuilderStore.getState()
    if (state.path) return
    const inferred = inferPath(state.selections, index)
    if (inferred) state.setPath(inferred)
  }, [index])

  // Phantom-id prune (entry-55 review): hydrated drafts, shareId loads and
  // presets can carry component ids the index no longer serves — invisible
  // picks that still count toward caps and 422 at save. Runs whenever
  // selections change once the index has resolved; pruneUnknown is a no-op
  // ({}) when everything resolves.
  useEffect(() => {
    if (!index) return
    const valid = new Set(index.components.map((c) => c.id))
    useBuilderStore.getState().pruneUnknown(valid)
  }, [index, selections])

  const categories = useMemo(
    () => (index ? [...index.categories].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [index],
  )
  const engine = useMemo(() => (index ? createRuleEngine(index) : null), [index])
  const result = useMemo(() => (engine ? engine.evaluate(selections) : null), [engine, selections])
  const limits = useMemo(
    () => (index ? resolveSlotLimits(index, selections) : {}),
    [index, selections],
  )
  const totalCents = useMemo(
    () =>
      Object.values(selections)
        .flat()
        .reduce((sum, id) => sum + (index?.components.find((c) => c.id === id)?.priceCents ?? 0), 0),
    [index, selections],
  )
  const missingRequired = useMemo(
    () => categories.filter((c) => c.required && (selections[c.id] ?? []).length === 0),
    [categories, selections],
  )
  // Curried per (index, path) — the in-path ramTypes set is built once here,
  // not per option row inside pathVisible (review L5).
  const pathFilter = useMemo(
    () => (index ? makePathVisible(index, path) : null),
    [index, path],
  )

  const {
    ensureSavedBuild,
    saveToAccount,
    addToCart,
    share,
    clearSavedBuild,
    saveState,
    saveView,
    cartState,
    shareState,
    cartLoading,
  } = useBuildActions(index)

  if (!hydrated || status === 'loading') {
    return (
      <main className="builder-page cfg" aria-busy="true">
        <div className="skeleton" style={{ height: 40 }} />
        <div className="cfg-layout">
          <div className="skeleton" style={{ height: 420 }} />
          <div className="skeleton" style={{ height: 320 }} />
        </div>
        <p className="state-msg" role="status">Loading builder index…</p>
      </main>
    )
  }

  if (status === 'error' || !index || !result) {
    return (
      <main className="builder-page cfg">
        <div className="error-banner" role="alert">
          <span>Could not load the compatibility index.</span>
          <button type="button" className="btn" onClick={retry}>Retry</button>
        </div>
      </main>
    )
  }

  if (categories.length === 0) {
    return (
      <main className="builder-page cfg">
        <p className="state-msg">No build slots are configured yet — add component categories in the admin panel.</p>
      </main>
    )
  }

  const select = (categoryId: string, componentId: string) => {
    const category = index.categories.find((c) => c.id === categoryId)
    // Cap risolto: regole spec-driven (es. ramSlots della mobo) valgono in
    // OGNI design. Cap shrink non pota i picks esistenti da solo — ma il
    // prossimo ADD applica la slice dello store (evict-oldest fino a `max`),
    // quindi con cap 2 e 4 picks un nuovo pick tiene solo gli ultimi 2.
    const max = resolvedMax(limits, { id: categoryId, maxSelectable: category?.maxSelectable })
    toggleSelect(categoryId, componentId, max)
  }

  const entryOf = (id: string): ComponentSpecEntry | undefined =>
    index.components.find((c) => c.id === id)

  // Platform path — a real switch clears the bound slots (cpu/mobo/ram/cooling)
  // so no stale cross-platform pick survives; the designs confirm beforehand.
  const setPath = (next: PlatformId | null) => {
    const current = useBuilderStore.getState().path
    if (next === current) return
    // Engaging or changing a path clears the bound slots (a pick that was legal
    // under the old filter may not be under the new one). Switching TO "no
    // preference" only widens the funnel — picks stay.
    if (next !== null) {
      for (const catId of pathBoundCategoryIds(index.categories)) clearSlot(catId)
    }
    setPathRaw(next)
  }

  // applyTemplate resets path → re-infer it from the restored picks so loading
  // an all-AMD preset also engages the AMD filter. The mount-time inference
  // effect is a once-guard and doesn't cover mid-session applies (review L4).
  const applyTemplateWithPath = (
    templateId: string,
    slots: TemplateSlot[],
    mode?: BuilderMode,
    rgbColor?: string,
  ) => {
    applyTemplate(templateId, slots, mode, rgbColor)
    const inferred = inferPath(useBuilderStore.getState().selections, index)
    if (inferred) useBuilderStore.getState().setPath(inferred)
  }

  // Hard filter (spec §C): with a path active, non-matching options are absent
  // from bound categories entirely — physics still comes from the rules below.
  const visibleComponents = (entries: ComponentSpecEntry[]): ComponentSpecEntry[] =>
    path && pathFilter ? entries.filter(pathFilter) : entries

  const optionsFor = (categoryId: string): ComponentSpecEntry[] =>
    visibleComponents(index.components.filter((c) => c.categoryId === categoryId))

  const excludedFor = (categoryId: string): Map<string, string> => {
    const excluded = new Map<string, string>()
    const categoryEval = result.categories.find((c) => c.categoryId === categoryId)
    for (const e of categoryEval?.excluded ?? []) {
      if (!excluded.has(e.componentId)) excluded.set(e.componentId, e.message)
    }
    return excluded
  }

  const optionRows = (categoryId: string): OptionRow[] =>
    buildOptionRows(index, result, categoryId, selections).filter((row) =>
      pathFilter ? pathFilter(row.entry) : true,
    )

  const value: BuilderContextValue = {
    state: {
      index,
      categories,
      selections,
      result,
      limits,
      totalCents,
      missingRequired,
      savedBuild,
      rgbColor,
      path,
      actionStatus: { saveState, saveView, cartState, shareState, cartLoading },
    },
    actions: {
      select,
      remove: removeComponent,
      clearSlot,
      setRgbColor,
      setPath,
      saveDraft: ensureSavedBuild,
      saveToAccount,
      addToCart,
      share,
      clearSavedBuild,
      applyTemplate: applyTemplateWithPath,
      retry,
    },
    meta: {
      entryOf,
      optionsFor,
      excludedFor,
      optionRows,
      templates,
      platforms: index.platforms ?? [],
      // engine/result are non-null past the guards above; the ?? keeps the
      // context contract never-throw without a non-null assertion.
      validateCurrent: () =>
        engine?.validateSelections(selections) ?? { errors: [], warnings: [] },
    },
  }

  return <BuilderContext value={value}>{children}</BuilderContext>
}
