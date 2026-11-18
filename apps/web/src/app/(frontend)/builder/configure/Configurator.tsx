'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ComponentSpecEntry } from '@buildmyrig/lib'
import { trackBuildStepCompleted } from '@/lib/analytics'
import { useBuilder } from '../builder-provider'
import { useBuilderStore } from '../builder-store'
import { PathSwitcher } from '../kit/PathSwitcher'
import { StepNavigation } from './StepNavigation'
import { StepPanel } from './StepPanel'
import { BuildRail } from './BuildRail'

/**
 * Design "classic" (entry 50 P2): pura presentazione dello step wizard.
 * Index fetch, engine, hydration, template e loading/error sono del
 * BuilderProvider — qui restano solo layout, filtri e navigazione step.
 */
export function Configurator() {
  const { state, actions, meta } = useBuilder()
  const { index, categories, selections, result, limits, totalCents, missingRequired } = state

  const rawStep = useBuilderStore((s) => s.stepIndex)
  const query = useBuilderStore((s) => s.query)
  const brand = useBuilderStore((s) => s.brand)
  const goToStep = useBuilderStore((s) => s.goToStep)
  const nextStep = useBuilderStore((s) => s.nextStep)
  const prevStep = useBuilderStore((s) => s.prevStep)
  const setQuery = useBuilderStore((s) => s.setQuery)
  const setBrand = useBuilderStore((s) => s.setBrand)

  const stepIndex = Math.min(rawStep, categories.length - 1)
  const category = categories[stepIndex]
  const options = meta.optionsFor(category.id)
  const selectedIds = selections[category.id] ?? []
  const excluded = meta.excludedFor(category.id)

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

  const canReview = missingRequired.length === 0

  return (
    <main className="builder-page cfg">
      <h1 className="sr-only">Configure your build</h1>
      <StepNavigation
        categories={categories}
        selections={selections}
        stepIndex={stepIndex}
        onSelect={goToStep}
      />

      <div className="cfg-path">
        {/* Entry 131: /builder/configure is immersive (site header hidden), so
            every design needs its own way back to the store. */}
        <Link href="/" className="cfg-back" aria-label="Back to store">
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Store</span>
        </Link>
        <PathSwitcher />
      </div>

      <div className="cfg-layout">
        <div className="cfg-main">
          <StepPanel
            category={category}
            slotLimit={limits[category.id]}
            options={visible}
            totalOptions={options.length}
            selectedIds={selectedIds}
            selectedEntries={selectedIds
              .map((id) => meta.entryOf(id))
              .filter((e): e is ComponentSpecEntry => Boolean(e))}
            excluded={excluded}
            warnedIds={warnedIds}
            query={query}
            brand={brand}
            brands={brands}
            onQuery={setQuery}
            onBrand={setBrand}
            onToggle={(componentId) => actions.select(category.id, componentId)}
            onClearSlot={() => actions.clearSlot(category.id)}
            onRemove={actions.remove}
            onPrev={prevStep}
            onNext={() => {
              // Funnel: advancing means this step is done (audit gap P5-X3).
              trackBuildStepCompleted(category.name, stepIndex, selectedIds.length)
              nextStep(categories.length - 1)
            }}
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
          warnings={meta.validateCurrent().warnings}
          onSlotClick={goToStep}
          onRemoveComponent={actions.remove}
        />
      </div>
    </main>
  )
}
