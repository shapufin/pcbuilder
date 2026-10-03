'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { useBuilder } from '../../builder-provider'
import { BuilderToasts, useToast } from '../../kit/BuilderToasts'
import { addSavedRef, loadSavedRefs, storeSavedRefs } from '../../kit/saved-refs'
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
  const { user } = useEcommerce()
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

  // P4: every successful GUEST save registers a guest-visible ref
  // (bmr_studio_builds) — nameless on silent saves so an explicit modal
  // save's name is preserved by addSavedRef's merge. Authed saves are
  // skipped: their list comes from REST, and persisting shareIds on a
  // shared machine would widen the capability set past logout (review F2).
  const savedShareId = state.savedBuild?.shareId ?? null
  const totalCents = state.totalCents
  useEffect(() => {
    if (!savedShareId || user) return
    storeSavedRefs(
      addSavedRef(loadSavedRefs(), { shareId: savedShareId, savedAt: Date.now(), priceCents: totalCents }),
    )
  }, [savedShareId, totalCents, user])

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
