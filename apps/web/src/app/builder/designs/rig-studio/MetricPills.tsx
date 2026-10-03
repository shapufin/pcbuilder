'use client'

import { Fan, Ruler, ShieldCheck, Zap, type LucideIcon } from 'lucide-react'
import { useBuilder } from '../../builder-provider'
import {
  categoryForZone,
  gpuFit,
  numSpecOf,
  picksForZone,
  psuMargin,
  textSpecOf,
  type StudioZone,
} from './studio-lib'

/** The icon arrives via prop — a component resolved by CallExpression and used
 *  as a JSX tag triggers react-hooks/static-components (P3a lesson). */
function PillGlyph({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon size={16} aria-hidden="true" />
}

interface PillDef {
  zone: StudioZone
  icon: LucideIcon
  label: string
  value: string
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
}

/**
 * Metric pills below the blueprint (port of MetricPills.tsx) — all from real
 * specs: GPU fit vs case, M.2 bus, radiator/fans, PSU margin. A missing
 * spec HIDES the pill (never renders "undefined"). Click → swap modal
 * for the category if the category exists, otherwise static pill.
 */
export function MetricPills({ onOpenSwap }: { onOpenSwap: (categoryId: string) => void }) {
  const { state } = useBuilder()
  const { categories, selections, index, result } = state

  const picks = (zone: StudioZone) => picksForZone(zone, selections, index)

  const pills: PillDef[] = []

  // GPU fit: gpuLengthMm vs caseGpuMaxLengthMm (ok/tight/oversize).
  const fit = gpuFit(picks('gpu')[0], picks('case')[0])
  if (fit) {
    const gpuMm = numSpecOf(picks('gpu')[0], 'gpuLengthMm')
    const maxMm = numSpecOf(picks('case')[0], 'caseGpuMaxLengthMm')
    pills.push({
      zone: 'gpu',
      icon: Ruler,
      label: 'GPU clearance',
      value: `${gpuMm} / ${maxMm} mm`,
      tone: fit === 'ok' ? 'ok' : fit === 'tight' ? 'warn' : 'danger',
    })
  }

  // M.2 bus: pcieVersion + storageInterface of the first storage pick.
  const storage = picks('storage')[0]
  const storageParts = [
    textSpecOf(storage, 'pcieVersion') ? `PCIe ${textSpecOf(storage, 'pcieVersion')}` : null,
    textSpecOf(storage, 'storageInterface'),
  ].filter((p): p is string => Boolean(p))
  if (storageParts.length > 0) {
    pills.push({
      zone: 'storage',
      icon: ShieldCheck,
      label: 'M.2 bus',
      value: storageParts.join(' · '),
      tone: 'neutral',
    })
  }

  // Cooler: radSizeMm + fanCount.
  const cooling = picks('aio')[0]
  const radMm = numSpecOf(cooling, 'radSizeMm')
  const fans = numSpecOf(cooling, 'fanCount')
  if (radMm !== null || fans !== null) {
    pills.push({
      zone: 'aio',
      icon: Fan,
      label: 'Radiator',
      value: [radMm !== null ? `${radMm}mm` : null, fans !== null ? `${fans} fans` : null]
        .filter((p): p is string => Boolean(p))
        .join(' · '),
      tone: 'neutral',
    })
  }

  // PSU margin: selected psuWatts − recommendedPsuWatts (negative → danger).
  const margin = psuMargin(result, selections, index)
  if (margin !== null) {
    pills.push({
      zone: 'psu',
      icon: Zap,
      label: 'PSU headroom',
      value: `${margin >= 0 ? '+' : ''}${margin}W`,
      tone: margin < 0 ? 'danger' : 'ok',
    })
  }

  return (
    <div className="studio-pills">
      {pills.map((pill) => {
        const category = categoryForZone(pill.zone, categories)
        const cls = `studio-pill studio-pill--${pill.tone}`
        const inner = (
          <>
            <span className="studio-pill__icon">
              <PillGlyph icon={pill.icon} />
            </span>
            <span className="studio-pill__text">
              <span className="studio-pill__label">{pill.label}</span>
              <span className="studio-pill__value">{pill.value}</span>
            </span>
          </>
        )
        return category ? (
          <button
            key={pill.zone}
            type="button"
            className={cls}
            onClick={() => onOpenSwap(category.id)}
          >
            {inner}
          </button>
        ) : (
          <div key={pill.zone} className={cls}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}
