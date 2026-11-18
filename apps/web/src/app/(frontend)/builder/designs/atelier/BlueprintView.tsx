'use client'

import { useState } from 'react'
import { useBuilder } from '../../builder-provider'
import {
  gpuFit,
  numSpecOf,
  picksForZone,
  psuMargin,
  textSpecOf,
} from '../../kit/part-lib'
import { AtelierStage } from './AtelierStage'
import {
  BLUEPRINT_LAYERS,
  type Atmosphere,
  type BlueprintLayer,
  type Perspective,
} from './atelier-lib'

type ClearanceCard = {
  key: string
  label: string
  value: string
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
  note: string
}

/**
 * Atelier blueprint screen (entry 131) — the mockup's second screen: a
 * subsystem-layer switch over the same live drawing, plus four clearance
 * cards. Cards are computed from real specs (kit/part-lib); a missing spec
 * hides the card instead of rendering "undefined".
 */
export function BlueprintView({
  atmosphere,
  perspective,
  onOpenSwap,
}: {
  atmosphere: Atmosphere
  perspective: Perspective
  onOpenSwap: (categoryId: string) => void
}) {
  const { state } = useBuilder()
  const { selections, index } = state
  const [layer, setLayer] = useState<BlueprintLayer>('composite')

  const picks = (zone: Parameters<typeof picksForZone>[0]) => picksForZone(zone, selections, index)
  const gpu = picks('gpu')[0]
  const chassis = picks('case')[0]
  const cooling = picks('aio')[0]
  const storage = picks('storage')[0]

  const cards: ClearanceCard[] = []

  const fit = gpuFit(gpu, chassis)
  const gpuMm = numSpecOf(gpu, 'gpuLengthMm')
  const maxMm = numSpecOf(chassis, 'caseGpuMaxLengthMm')
  if (fit && gpuMm !== null && maxMm !== null) {
    cards.push({
      key: 'gpu',
      label: 'GPU length clearance',
      value: `${gpuMm} / ${maxMm} mm`,
      tone: fit === 'ok' ? 'ok' : fit === 'tight' ? 'warn' : 'danger',
      note:
        fit === 'ok'
          ? `${maxMm - gpuMm} mm of headroom in the chassis`
          : fit === 'tight'
            ? 'Tight fit — check cable routing'
            : 'Does not fit the selected chassis',
    })
  }

  const rad = numSpecOf(cooling, 'radSizeMm')
  const fans = numSpecOf(cooling, 'fanCount')
  if (rad !== null || fans !== null) {
    cards.push({
      key: 'cooling',
      label: 'Cooling envelope',
      value: [rad !== null ? `${rad} mm` : null, fans !== null ? `${fans} fans` : null]
        .filter(Boolean)
        .join(' · '),
      tone: 'neutral',
      note: 'Radiator size and fan count from the selected cooler',
    })
  }

  const bus = [textSpecOf(storage, 'pcieVersion'), textSpecOf(storage, 'storageInterface')]
    .filter(Boolean)
    .join(' · ')
  if (bus) {
    cards.push({
      key: 'storage',
      label: 'Storage bus',
      value: bus,
      tone: 'neutral',
      note: 'Direct CPU lane for the primary M.2 slot',
    })
  }

  const margin = psuMargin(state.result, selections, index)
  if (margin !== null) {
    cards.push({
      key: 'psu',
      label: 'PSU headroom',
      value: `${margin >= 0 ? '+' : ''}${margin} W`,
      tone: margin < 0 ? 'danger' : 'ok',
      note: margin < 0 ? 'Undersized for the estimated draw' : 'Within the power envelope',
    })
  }

  return (
    <section className="atl-blueprint" aria-label="Architectural blueprint">
      <div className="atl-blueprint__head">
        <div>
          <span className="atl-blueprint__eyebrow">Live architectural CAD &amp; bus topology</span>
          <h2 className="atl-blueprint__title">Architectural blueprint</h2>
          <p className="atl-blueprint__copy">
            Clearances, bus routing and power topology recomputed from the current configuration.
          </p>
        </div>
      </div>

      <div className="atl-layers" role="group" aria-label="Subsystem layers">
        {BLUEPRINT_LAYERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`atl-layer${layer === entry.id ? ' atl-layer--active' : ''}`}
            aria-pressed={layer === entry.id}
            onClick={() => setLayer(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <AtelierStage
        atmosphere={atmosphere}
        perspective={perspective}
        layer={layer}
        variant="blueprint"
        onOpenSwap={onOpenSwap}
      />

      {cards.length > 0 ? (
        <div className="atl-cards">
          {cards.map((card) => (
            <div key={card.key} className={`atl-card atl-card--${card.tone}`}>
              <span className="atl-card__label">{card.label}</span>
              <strong className="atl-card__value">{card.value}</strong>
              <span className="atl-card__note">{card.note}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="atl-empty">
          Clearance cards appear once a graphics card, chassis, cooler, storage and power supply are
          installed.
        </p>
      )}
    </section>
  )
}
