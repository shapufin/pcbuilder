'use client'

import { useCallback, useState, type CSSProperties } from 'react'
import { builderPaletteVars } from '@buildmyrig/lib'
import { useBuilder } from '../../builder-provider'
import type { BuilderDesignProps } from '../../designs'
import { BuilderToasts, useToast } from '../../kit/BuilderToasts'
import { SavedBuildsModal } from '../../kit/SavedBuildsModal'
import { AtelierHeader } from './AtelierHeader'
import { AtelierStage } from './AtelierStage'
import { SpecSheet } from './SpecSheet'
import { BlueprintView } from './BlueprintView'
import { AtelierSwapSheet } from './AtelierSwapSheet'
import { CommissionSheet } from './CommissionSheet'
import {
  ATMOSPHERES,
  PERSPECTIVES,
  type Atmosphere,
  type AtelierView,
  type Perspective,
} from './atelier-lib'
import '../../kit/modal.css'
import './atelier.css'

/**
 * The "atelier" design (entry 131) — port of PC_BUILDER_ATELIER_DESIGN: an
 * editorial, gallery-like configurator with a large vector stage, numbered
 * spec sheet, and a second "architectural blueprint" screen with subsystem
 * layers. Pure presentation: every value comes from useBuilder(), the
 * provider owns index/engine/limits/loading/persistence.
 *
 * Theme contract: `palette` comes from the BUILDER_DESIGNS registry via
 * BuilderShell. 'accent' mounts the --bd-* ramp so the drawing keeps its
 * contrast ladder while the hue/texture still follows the admin theme.
 */
export function AtelierDesign({ palette = 'accent' }: BuilderDesignProps) {
  const { state, meta } = useBuilder()
  const { toasts, add, dismiss } = useToast()
  const [view, setView] = useState<AtelierView>('studio')
  const [atmosphere, setAtmosphere] = useState<Atmosphere>('daylight')
  const [perspective, setPerspective] = useState<Perspective>('iso')
  const [swapCategoryId, setSwapCategoryId] = useState<string | null>(null)
  const [commissionOpen, setCommissionOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)

  const closeSwap = useCallback(() => setSwapCategoryId(null), [])
  const openCommission = useCallback(() => setCommissionOpen(true), [])
  const closeCommission = useCallback(() => setCommissionOpen(false), [])
  const openSaved = useCallback(() => setSavedOpen(true), [])
  const closeSaved = useCallback(() => setSavedOpen(false), [])

  // Stage header reads the real chassis pick; falls back to the category name
  // so a build with no case still says what the slot is.
  const caseCategory = state.categories.find((c) => c.slug === 'case')
  const caseEntry = caseCategory
    ? meta.entryOf(state.selections[caseCategory.id]?.[0] ?? '')
    : undefined
  const stageTitle = caseEntry?.display?.name ?? caseCategory?.name ?? 'Chassis'
  const stageChip = caseEntry ? 'configured' : 'unset'

  return (
    <main
      className="bdesign-atelier builder-page"
      style={builderPaletteVars(palette) as CSSProperties}
    >
      <h1 className="sr-only">Configure your build</h1>

      <AtelierHeader
        view={view}
        onViewChange={setView}
        onCommission={openCommission}
        onOpenSaved={openSaved}
      />

      {view === 'studio' ? (
        <div className="atl-studio">
          <div className="atl-studio__stage">
            <div className="atl-stage-controls">
              <div className="atl-stage-controls__title">
                <span className="atl-dot" aria-hidden="true" />
                <strong>{stageTitle}</strong>
                <span className="atl-chip">{stageChip}</span>
              </div>

              <div className="atl-segmented" role="group" aria-label="Atmosphere">
                {ATMOSPHERES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`atl-seg${atmosphere === entry.id ? ' atl-seg--on' : ''}`}
                    aria-pressed={atmosphere === entry.id}
                    onClick={() => setAtmosphere(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>

              <div className="atl-segmented" role="group" aria-label="Projection">
                {PERSPECTIVES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`atl-seg${perspective === entry.id ? ' atl-seg--on' : ''}`}
                    aria-pressed={perspective === entry.id}
                    onClick={() => setPerspective(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            <AtelierStage
              atmosphere={atmosphere}
              perspective={perspective}
              onOpenSwap={setSwapCategoryId}
            />
          </div>

          <SpecSheet onOpenSwap={setSwapCategoryId} onCommission={openCommission} />
        </div>
      ) : (
        <BlueprintView
          atmosphere={atmosphere}
          perspective={perspective}
          onOpenSwap={setSwapCategoryId}
        />
      )}

      {swapCategoryId ? (
        <AtelierSwapSheet categoryId={swapCategoryId} onClose={closeSwap} onToast={add} />
      ) : null}

      {commissionOpen ? <CommissionSheet onClose={closeCommission} onToast={add} /> : null}
      {savedOpen ? <SavedBuildsModal onClose={closeSaved} onToast={add} /> : null}

      <BuilderToasts toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
