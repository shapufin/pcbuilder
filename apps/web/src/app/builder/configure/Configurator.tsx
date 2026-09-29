'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { createRuleEngine, type ComponentSpecEntry } from '@buildmyrig/lib'
import { useBuilderIndex } from '../useBuilderIndex'
import { useBuilderStore } from '../builder-store'
import type { ConfigureTemplate } from './page'
import { StepNavigation } from './StepNavigation'
import { StepPanel } from './StepPanel'
import { BuildRail } from './BuildRail'

const emptySubscribe = () => () => {}

export function Configurator({ template }: { template: ConfigureTemplate | null }) {
  const { index, status, retry } = useBuilderIndex()
  // Hydration gate: false during SSR, flips to true on the client without an
  // effect (react-hooks/set-state-in-effect).
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const selections = useBuilderStore((s) => s.selections)
  const rawStep = useBuilderStore((s) => s.stepIndex)
  const query = useBuilderStore((s) => s.query)
  const brand = useBuilderStore((s) => s.brand)
  const goToStep = useBuilderStore((s) => s.goToStep)
  const nextStep = useBuilderStore((s) => s.nextStep)
  const prevStep = useBuilderStore((s) => s.prevStep)
  const toggleSelect = useBuilderStore((s) => s.toggleSelect)
  const removeComponent = useBuilderStore((s) => s.removeComponent)
  const clearSlot = useBuilderStore((s) => s.clearSlot)
  const setQuery = useBuilderStore((s) => s.setQuery)
  const setBrand = useBuilderStore((s) => s.setBrand)
  const applyTemplate = useBuilderStore((s) => s.applyTemplate)

  useEffect(() => {
    if (!hydrated || !template) return
    const state = useBuilderStore.getState()
    const hasSelection = Object.values(state.selections).some((ids) => ids.length > 0)
    if (state.templateId !== template.id || !hasSelection) {
      applyTemplate(template.id, template.slots)
    }
  }, [hydrated, template, applyTemplate])

  const categories = useMemo(
    () => (index ? [...index.categories].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [index],
  )
  const engine = useMemo(() => (index ? createRuleEngine(index) : null), [index])
  const result = useMemo(() => (engine ? engine.evaluate(selections) : null), [engine, selections])

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

  const stepIndex = Math.min(rawStep, categories.length - 1)
  const category = categories[stepIndex]
  const categoryEval = result.categories.find((c) => c.categoryId === category.id)
  const options = index.components.filter((c) => c.categoryId === category.id)
  const selectedIds = selections[category.id] ?? []

  const excluded = new Map<string, string>()
  for (const e of categoryEval?.excluded ?? []) excluded.set(e.componentId, e.message)

  const warnedIds = new Set(
    result.warnings.filter((w) => w.componentIdB !== null).map((w) => w.componentIdB as string),
  )

  const brands = [...new Set(options.map((o) => o.display?.brand).filter((b): b is string => Boolean(b)))].sort()

  const visible = options.filter((o) => {
    if (brand && o.display?.brand !== brand) return false
    if (query.trim()) {
      const haystack = `${o.display?.name ?? ''} ${o.display?.brand ?? ''} ${o.display?.description ?? ''}`.toLowerCase()
      if (!haystack.includes(query.trim().toLowerCase())) return false
    }
    return true
  })

  const missingRequired = categories.filter((c) => c.required && (selections[c.id] ?? []).length === 0)
  const canReview = missingRequired.length === 0

  const priceOf = (id: string): ComponentSpecEntry | undefined => index.components.find((c) => c.id === id)
  const totalCents = Object.values(selections)
    .flat()
    .reduce((sum, id) => sum + (priceOf(id)?.priceCents ?? 0), 0)

  return (
    <main className="builder-page cfg">
      <StepNavigation
        categories={categories}
        selections={selections}
        stepIndex={stepIndex}
        onSelect={goToStep}
      />

      <div className="cfg-layout">
        <div className="cfg-main">
          <StepPanel
            category={category}
            options={visible}
            totalOptions={options.length}
            selectedIds={selectedIds}
            selectedEntries={selectedIds
              .map((id) => index.components.find((c) => c.id === id))
              .filter((e): e is ComponentSpecEntry => Boolean(e))}
            excluded={excluded}
            warnedIds={warnedIds}
            query={query}
            brand={brand}
            brands={brands}
            onQuery={setQuery}
            onBrand={setBrand}
            onToggle={(componentId) => toggleSelect(category.id, componentId, category.maxSelectable)}
            onClearSlot={() => clearSlot(category.id)}
            onRemove={removeComponent}
            onPrev={prevStep}
            onNext={() => nextStep(categories.length - 1)}
            isFirst={stepIndex === 0}
            isLast={stepIndex === categories.length - 1}
          />
        </div>

        <BuildRail
          categories={categories}
          index={index}
          selections={selections}
          result={result}
          totalCents={totalCents}
          canReview={canReview}
          missingRequired={missingRequired}
          onSlotClick={goToStep}
          onRemoveComponent={removeComponent}
        />
      </div>
    </main>
  )
}
