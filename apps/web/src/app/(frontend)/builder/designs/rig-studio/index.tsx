'use client'

import { useCallback, useState, type CSSProperties } from 'react'
import { useBuilder } from '../../builder-provider'
import { BuilderToasts, useToast } from '../../kit/BuilderToasts'
import { StudioHeader } from './StudioHeader'
import { StudioBay } from './StudioBay'
import { StudioSwapModal } from './StudioSwapModal'
import { RigBlueprint } from './RigBlueprint'
import { StudioToolbar } from './StudioToolbar'
import { MetricPills } from './MetricPills'
import { PsuTelemetryCard } from './PsuTelemetryCard'
import { BuildPriceCard } from './BuildPriceCard'
import { CompactMatrixView } from './CompactMatrixView'
import { DeployModal } from './DeployModal'
import { SavedBuildsModal } from './SavedBuildsModal'
import type { StudioView, StudioZone } from './studio-lib'
import './rig-studio.css'

/**
 * The "rig-studio" design — the CAD-dark look ported from the RIG_model1
 * mockup: header strip, component bay with swap modal, zone-mapped blueprint
 * canvas, viewer toolbar (x-ray/heatmap/RGB), metric pills, telemetry + price
 * cards, compact matrix view, deploy pipeline + saved-builds manager (P4).
 * Pure presentation: every value comes from useBuilder(); the provider owns
 * index/engine/limits/loading. --rgb-accent is a runtime custom property
 * (not a literal) set on the design root, not documentElement. hoverZone is
 * lifted here because it highlights both the SVG zone and the matching slot
 * card in the bay ([data-zone] → .is-hot).
 */
export function RigStudioDesign() {
  const { state } = useBuilder()
  const { toasts, add, dismiss } = useToast()
  const [view, setView] = useState<StudioView>('studio')
  const [swapCategoryId, setSwapCategoryId] = useState<string | null>(null)
  const [deployOpen, setDeployOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [hoverZone, setHoverZone] = useState<StudioZone | null>(null)
  const [rgbEnabled, setRgbEnabled] = useState(true)
  const [xray, setXray] = useState(false)
  const [heatmap, setHeatmap] = useState(false)
  const closeSwap = useCallback(() => setSwapCategoryId(null), [])
  const openDeploy = useCallback(() => setDeployOpen(true), [])
  const openSaved = useCallback(() => setSavedOpen(true), [])
  const closeDeploy = useCallback(() => setDeployOpen(false), [])
  const closeSaved = useCallback(() => setSavedOpen(false), [])

  // Guest saved-build refs (bmr_studio_builds) are written at save time by
  // useBuildActions.ensureSavedBuild — a watch effect would leak an authed
  // shareId into the guest list on logout (entry-55 review F7).

  return (
    <main
      className="bdesign-rig-studio builder-page"
      style={{ '--rgb-accent': state.rgbColor } as CSSProperties}
    >
      <StudioHeader
        view={view}
        onViewChange={setView}
        onOpenDeploy={openDeploy}
        onOpenSaved={openSaved}
      />

      {view === 'matrix' ? (
        <CompactMatrixView onOpenSwap={setSwapCategoryId} />
      ) : (
        <div className="studio-grid">
          <StudioBay
            onOpenSwap={setSwapCategoryId}
            hoverZone={hoverZone}
            onHoverZone={setHoverZone}
          />
          <section className="studio-canvas" aria-label="Rig blueprint canvas">
            <StudioToolbar
              xray={xray}
              onToggleXray={() => setXray((v) => !v)}
              heatmap={heatmap}
              onToggleHeatmap={() => setHeatmap((v) => !v)}
              rgbEnabled={rgbEnabled}
              onToggleRgb={() => setRgbEnabled((v) => !v)}
            />
            <RigBlueprint
              onZoneClick={setSwapCategoryId}
              hoverZone={hoverZone}
              onHoverZone={setHoverZone}
              rgbEnabled={rgbEnabled}
              xray={xray}
              heatmap={heatmap}
            />
            <MetricPills onOpenSwap={setSwapCategoryId} />
            <div className="studio-canvas__cards">
              <PsuTelemetryCard />
              <BuildPriceCard onOpenDeploy={openDeploy} />
            </div>
          </section>
        </div>
      )}

      {swapCategoryId ? (
        <StudioSwapModal
          categoryId={swapCategoryId}
          onClose={closeSwap}
          onToast={add}
        />
      ) : null}

      {deployOpen ? <DeployModal onClose={closeDeploy} onToast={add} /> : null}
      {savedOpen ? <SavedBuildsModal onClose={closeSaved} onToast={add} /> : null}

      <BuilderToasts toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
