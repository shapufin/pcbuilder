'use client'

import type { KeyboardEvent } from 'react'
import { useBuilder } from '../../builder-provider'
import {
  ZONE_LABEL,
  categoryForZone,
  numSpecOf,
  picksForZone,
  textSpecOf,
  wattsOf,
  type StudioZone,
} from '../../kit/part-lib'
import {
  atmosphereColor,
  atmosphereOpacity,
  type Atmosphere,
  type BlueprintLayer,
  type Perspective,
} from './atelier-lib'

const ZONES: StudioZone[] = ['case', 'mobo', 'cpu', 'ram', 'aio', 'gpu', 'storage', 'psu']

/**
 * Atelier rig stage (entry 131) — the mockup's hero drawing, rebuilt as a
 * live zone map: every zone opens the swap sheet for its category, empty
 * zones render dashed with a "pick" label, installed zones show the real
 * part name + its headline spec. Perspective and atmosphere are view-only
 * (they never touch the build); the blueprint variant reuses the same
 * geometry with subsystem overlays.
 */
export function AtelierStage({
  atmosphere,
  perspective,
  layer = 'composite',
  variant = 'studio',
  onOpenSwap,
}: {
  atmosphere: Atmosphere
  perspective: Perspective
  layer?: BlueprintLayer
  variant?: 'studio' | 'blueprint'
  onOpenSwap: (categoryId: string) => void
}) {
  const { state } = useBuilder()
  const { categories, selections, index } = state

  const catOf = (zone: StudioZone) => categoryForZone(zone, categories)
  const picks = (zone: StudioZone) => picksForZone(zone, selections, index)
  const entryOf = (zone: StudioZone) => picks(zone)[0]

  const zoneHandlers = (zone: StudioZone) => {
    const category = catOf(zone)
    if (!category) return { className: 'atl-zone' }
    const activate = () => onOpenSwap(category.id)
    return {
      role: 'button' as const,
      tabIndex: 0,
      'aria-label': `Swap ${category.name}`,
      className: `atl-zone atl-zone--hit${picks(zone).length > 0 ? ' is-filled' : ''}`,
      onClick: activate,
      onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate()
        }
      },
    }
  }

  const name = (zone: StudioZone): string => {
    const entry = entryOf(zone)
    const category = catOf(zone)
    if (!category) return ZONE_LABEL[zone]
    if (!entry) return `Pick ${category.name.toLowerCase()}`
    return entry.display?.name ?? category.name
  }

  const detail = (zone: StudioZone): string => {
    const entry = entryOf(zone)
    if (!entry) return 'empty'
    switch (zone) {
      case 'cpu': {
        const socket = textSpecOf(entry, 'socket')
        const watts = wattsOf(entry)
        return [socket, watts ? `${watts}W` : null].filter(Boolean).join(' · ') || 'installed'
      }
      case 'gpu': {
        const len = numSpecOf(entry, 'gpuLengthMm')
        const watts = wattsOf(entry)
        return [len ? `${len}mm` : null, watts ? `${watts}W` : null].filter(Boolean).join(' · ') || 'installed'
      }
      case 'ram': {
        const speed = numSpecOf(entry, 'ramSpeedMhz')
        return [textSpecOf(entry, 'ramType'), speed ? `${speed}MHz` : null].filter(Boolean).join(' · ') || 'installed'
      }
      case 'aio': {
        const rad = numSpecOf(entry, 'radSizeMm')
        return rad ? `${rad}mm radiator` : 'installed'
      }
      case 'psu': {
        const watts = numSpecOf(entry, 'psuWatts')
        return watts ? `${watts}W` : 'installed'
      }
      case 'storage':
        return textSpecOf(entry, 'storageInterface') ?? 'installed'
      case 'mobo':
        return textSpecOf(entry, 'moboFormFactor') ?? 'installed'
      case 'case': {
        const factors = entry.specs.caseSupportedFormFactors ?? entry.display?.specs?.caseSupportedFormFactors
        return Array.isArray(factors) && factors.length > 0 ? factors.join(' / ') : 'chassis'
      }
      default:
        return 'installed'
    }
  }

  const ramPicks = picks('ram')
  const caseEntry = entryOf('case')
  const lit = (zone: StudioZone) => picks(zone).some((e) => e.display?.hasRgb)

  // Overlays are exclusive: 'composite' is the plain drawing (the mockup's
  // default), a named layer adds exactly its own overlay. Stacking them all
  // made the coolant/airflow labels collide.
  const show = (which: BlueprintLayer): boolean => variant === 'blueprint' && layer === which

  return (
    <div className={`atl-stage atl-stage--${perspective}${variant === 'blueprint' ? ' atl-stage--blueprint' : ''}`}>
      <svg
        className="atl-stage__svg"
        viewBox="0 0 760 560"
        role="group"
        aria-label={variant === 'blueprint' ? 'Architectural blueprint' : 'Rig stage'}
      >
        <defs>
          <radialGradient id="atl-atmosphere" cx="50%" cy="38%" r="72%">
            <stop
              offset="0%"
              style={{
                stopColor: atmosphereColor(atmosphere),
                stopOpacity: atmosphereOpacity(atmosphere),
              }}
            />
            <stop offset="100%" stopColor="var(--color-bg)" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="atl-glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--color-text)', stopOpacity: 0.05 }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-bg)', stopOpacity: 0.22 }} />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="760" height="560" fill="url(#atl-atmosphere)" pointerEvents="none" />

        {/* Chassis — 'case' zone */}
        <g {...zoneHandlers('case')}>
          <rect x="60" y="40" width="640" height="480" rx="18" className="atl-shell" />
          <rect x="76" y="56" width="608" height="448" rx="12" className="atl-well" />
          <rect
            x="84"
            y="64"
            width="592"
            height="432"
            rx="10"
            className="atl-glass"
            fill="url(#atl-glass)"
            pointerEvents="none"
          />
        </g>

        {/* Radiator — 'aio' zone */}
        <g {...zoneHandlers('aio')}>
          <rect x="104" y="80" width="300" height="24" rx="6" className="atl-part" />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={150 + i * 100} cy={92} r={8} className={lit('aio') ? 'atl-fan atl-fan--lit' : 'atl-fan'} />
          ))}
        </g>

        {/* Motherboard — 'mobo' zone */}
        <g {...zoneHandlers('mobo')}>
          <rect x="104" y="120" width="290" height="330" rx="8" className="atl-part atl-part--mobo" />
          <text x="116" y="140" className="atl-svg-label">
            {show('pcie') ? 'E-ATX · PCIe 5.0 x16' : 'MAINBOARD'}
          </text>
        </g>

        {/* CPU — 'cpu' zone */}
        <g {...zoneHandlers('cpu')}>
          <rect x="140" y="176" width="104" height="104" rx="10" className="atl-part-strong" />
          <circle cx="192" cy="228" r="36" className="atl-die" />
          <text x="192" y="226" textAnchor="middle" className="atl-svg-value">
            {entryOf('cpu') ? `${wattsOf(entryOf('cpu'))}W` : '—'}
          </text>
          <text x="192" y="242" textAnchor="middle" className="atl-svg-micro">
            {textSpecOf(entryOf('cpu'), 'socket') ?? 'CPU'}
          </text>
        </g>

        {/* Memory — 'ram' zone */}
        <g {...zoneHandlers('ram')}>
          <rect x="262" y="150" width="110" height="180" rx="8" className="atl-part" />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={272 + i * 25}
              y={162}
              width={12}
              height={156}
              rx={3}
              className={i < Math.max(ramPicks.length, 1) ? 'atl-ram atl-ram--on' : 'atl-ram'}
            />
          ))}
        </g>

        {/* Storage — 'storage' zone */}
        <g {...zoneHandlers('storage')}>
          <rect x="600" y="300" width="58" height="112" rx="6" className="atl-part" />
          <text x="629" y="360" textAnchor="middle" className="atl-svg-micro">
            M.2
          </text>
        </g>

        {/* Case fans — decorative, follow the case's RGB */}
        {[0, 1, 2].map((i) => (
          <g key={i} pointerEvents="none">
            <circle cx={632} cy={140 + i * 84} r={22} className={lit('case') ? 'atl-fan atl-fan--lit' : 'atl-fan'} />
            <circle cx={632} cy={140 + i * 84} r={6} className="atl-fan-hub" />
          </g>
        ))}

        {/* GPU — 'gpu' zone */}
        <g {...zoneHandlers('gpu')}>
          <rect x="116" y="382" width="430" height="66" rx="8" className="atl-part-strong" />
          <circle cx="164" cy="415" r={16} className={lit('gpu') ? 'atl-fan atl-fan--lit' : 'atl-fan'} />
          <circle cx="212" cy="415" r={16} className={lit('gpu') ? 'atl-fan atl-fan--lit' : 'atl-fan'} />
          <text x="300" y="412" textAnchor="middle" className="atl-svg-label">
            {entryOf('gpu') ? (entryOf('gpu')?.display?.name ?? 'GPU') : 'GPU SLOT'}
          </text>
          <text x="300" y="430" textAnchor="middle" className="atl-svg-micro">
            {numSpecOf(entryOf('gpu'), 'gpuLengthMm')
              ? `${numSpecOf(entryOf('gpu'), 'gpuLengthMm')}mm`
              : 'pick a graphics card'}
          </text>
        </g>

        {/* PSU shroud — 'psu' zone */}
        <g {...zoneHandlers('psu')}>
          <rect x="104" y="464" width="470" height="30" rx="6" className="atl-part" />
          <text x="116" y="484" className="atl-svg-micro">
            {entryOf('psu')
              ? `${entryOf('psu')?.display?.name ?? 'PSU'} · ${numSpecOf(entryOf('psu'), 'psuWatts') ?? '—'}W`
              : 'PSU BAY — PICK A POWER SUPPLY'}
          </text>
        </g>

        {/* ---------- blueprint overlays ---------- */}
        {variant === 'blueprint' && show('pcie') && (
          <g className="atl-overlay" pointerEvents="none">
            <path d="M 244 228 L 546 228 L 546 415" className="atl-flow atl-flow--pcie" />
            <text x="552" y="222" className="atl-svg-micro">
              PCIe 5.0 x16 → GPU
            </text>
          </g>
        )}

        {variant === 'blueprint' && show('coolant') && (
          <g className="atl-overlay" pointerEvents="none">
            <path d="M 254 92 C 320 120, 330 170, 254 200" className="atl-flow atl-flow--coolant" />
            <path d="M 192 176 C 192 140, 210 110, 254 92" className="atl-flow atl-flow--coolant" />
            <text x="300" y="118" className="atl-svg-micro">
              coolant loop · pump → radiator
            </text>
          </g>
        )}

        {variant === 'blueprint' && show('airflow') && (
          <g className="atl-overlay" pointerEvents="none">
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M 690 ${140 + i * 84} L 400 ${140 + i * 84}`}
                className="atl-flow atl-flow--air"
              />
            ))}
            <text x="430" y="120" className="atl-svg-micro">
              intake → exhaust
            </text>
          </g>
        )}

        {/* Studio "Airflow" perspective — same arrows, no blueprint needed. */}
        {variant === 'studio' && perspective === 'airflow' && (
          <g className="atl-overlay" pointerEvents="none">
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M 690 ${140 + i * 84} L 400 ${140 + i * 84}`}
                className="atl-flow atl-flow--air"
              />
            ))}
          </g>
        )}

        {variant === 'blueprint' && show('clearance') && (
          <g className="atl-overlay" pointerEvents="none">
            <line x1="116" y1="462" x2="546" y2="462" className="atl-dim" />
            <text x="330" y="458" textAnchor="middle" className="atl-svg-micro">
              GPU length · {numSpecOf(entryOf('gpu'), 'gpuLengthMm') ?? '—'}mm / case{' '}
              {numSpecOf(caseEntry, 'caseGpuMaxLengthMm') ?? '—'}mm
            </text>
          </g>
        )}
      </svg>

      {/* Zone labels — DOM, so they stay readable and wrap like the mockup.
          The blueprint screen keeps the drawing clean (its cards carry the
          data), so the list mounts in the studio view only. */}
      {variant === 'studio' ? (
        <ul className="atl-hotspots">
          {ZONES.filter((zone) => catOf(zone)).map((zone) => (
            <li key={zone}>
              <button
                type="button"
                className={`atl-hotspot${picks(zone).length > 0 ? ' atl-hotspot--filled' : ''}`}
                onClick={() => onOpenSwap(catOf(zone)!.id)}
              >
                <span className="atl-hotspot__dot" aria-hidden="true" />
                <span className="atl-hotspot__text">
                  <strong>{name(zone)}</strong>
                  <em>{detail(zone)}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
