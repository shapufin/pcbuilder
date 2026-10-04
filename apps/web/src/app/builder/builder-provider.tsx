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
  children,
}: {
  template: ConfigureTemplate | null
  templates: ConfigureTemplate[]
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

  const optionsFor = (categoryId: string): ComponentSpecEntry[] =>
    index.components.filter((c) => c.categoryId === categoryId)

  const excludedFor = (categoryId: string): Map<string, string> => {
    const excluded = new Map<string, string>()
    const categoryEval = result.categories.find((c) => c.categoryId === categoryId)
    for (const e of categoryEval?.excluded ?? []) {
      if (!excluded.has(e.componentId)) excluded.set(e.componentId, e.message)
    }
    return excluded
  }

  const optionRows = (categoryId: string): OptionRow[] =>
    buildOptionRows(index, result, categoryId, selections)

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
      actionStatus: { saveState, saveView, cartState, shareState, cartLoading },
    },
    actions: {
      select,
      remove: removeComponent,
      clearSlot,
      setRgbColor,
      saveDraft: ensureSavedBuild,
      saveToAccount,
      addToCart,
      share,
      clearSavedBuild,
      applyTemplate,
      retry,
    },
    meta: {
      entryOf,
      optionsFor,
      excludedFor,
      optionRows,
      templates,
      // engine/result are non-null past the guards above; the ?? keeps the
      // context contract never-throw without a non-null assertion.
      validateCurrent: () =>
        engine?.validateSelections(selections) ?? { errors: [], warnings: [] },
    },
  }

  return <BuilderContext value={value}>{children}</BuilderContext>
}
