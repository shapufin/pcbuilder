'use client'

import type { CSSProperties, KeyboardEvent } from 'react'
import type { ComponentSpecEntry } from '@buildmyrig/lib'
import { resolvedMax } from '@buildmyrig/lib'
import { useBuilder } from '../../builder-provider'
import {
  categoryForZone,
  heatmapWeight,
  numSpecOf,
  picksForZone,
  textSpecOf,
  wattsOf,
  ZONE_LABEL,
  zoneWatts,
  type StudioZone,
} from './studio-lib'

const ZONES: StudioZone[] = ['gpu', 'cpu', 'aio', 'mobo', 'ram', 'storage', 'case', 'psu']

/** Bounding box of each zone, used by the heatmap overlay layer. */
const ZONE_HEAT_BOUNDS: Record<StudioZone, { x: number; y: number; w: number; h: number }> = {
  case: { x: 150, y: 45, w: 620, h: 590 },
  mobo: { x: 220, y: 105, w: 480, h: 435 },
  cpu: { x: 360, y: 185, w: 130, h: 120 },
  aio: { x: 230, y: 55, w: 470, h: 44 },
  ram: { x: 518, y: 160, w: 116, h: 170 },
  storage: { x: 350, y: 325, w: 220, h: 72 },
  gpu: { x: 200, y: 375, w: 510, h: 120 },
  psu: { x: 170, y: 530, w: 560, h: 85 },
}

/** DIMM geometry: up to 4 physical slots (26px pitch starting at x=540). */
const MAX_DIMM_SLOTS = 4
const DIMM_PITCH = 26
const DIMM_X = 540

/** Cross blades for a fan centered at (cx,cy) with radius r. */
const fanBlades = (cx: number, cy: number, r: number): string =>
  `M ${cx} ${cy - r} L ${cx} ${cy + r} M ${cx - r} ${cy} L ${cx + r} ${cy}`

const rgbPaint = (on: boolean, prop: 'fill' | 'stroke'): CSSProperties | undefined =>
  on ? ({ [prop]: 'var(--rgb-accent)' } as CSSProperties) : undefined

const heatOpacity = (weight: number): CSSProperties => ({ opacity: weight * 0.5 })

/**
 * Chassis blueprint (port of the mockup's RigBlueprintSvg): the 8 zones of
 * plan §6.3 mapped to real categories via zoneForCategory. Labels come only
 * from real specs (pump LCD = CPU tdpWatts, M.2 = pcieVersion/
 * storageInterface, GPU = gpuLengthMm, PSU = psuWatts) — an empty slot
 * renders a dashed socket, never invented data. Unmapped slugs → no zone
 * (the bay and matrix views still cover them).
 * Zones = role="button" + Enter/Space → opens that category's swap modal.
 */
export function RigBlueprint({
  onZoneClick,
  hoverZone,
  onHoverZone,
  rgbEnabled,
  xray,
  heatmap,
}: {
  onZoneClick: (categoryId: string) => void
  hoverZone: StudioZone | null
  onHoverZone: (zone: StudioZone | null) => void
  rgbEnabled: boolean
  xray: boolean
  heatmap: boolean
}) {
  const { state } = useBuilder()
  const { categories, selections, index, result, limits } = state

  const picks = (zone: StudioZone) => picksForZone(zone, selections, index)
  const catOf = (zone: StudioZone) => categoryForZone(zone, categories)
  /** RGB lit = rgbEnabled toggle AND the pick declares display.hasRgb. */
  const lit = (entry: ComponentSpecEntry | undefined): boolean =>
    rgbEnabled && Boolean(entry?.display?.hasRgb)

  const caseEntry = picks('case')[0]
  const moboEntry = picks('mobo')[0]
  const cpuEntry = picks('cpu')[0]
  const coolingEntry = picks('aio')[0]
  const ramEntries = picks('ram')
  const storageEntries = picks('storage')
  const gpuEntry = picks('gpu')[0]
  const psuEntry = picks('psu')[0]
  const caseFanCategory = categories.find((c) => c.slug === 'case-fan')
  const caseFanCount = caseFanCategory ? (selections[caseFanCategory.id] ?? []).length : 0

  const ramCategory = catOf('ram')
  const ramMax = ramCategory ? resolvedMax(limits, ramCategory) : 0
  // N DIMM groups by actual picks, visually capped at the resolved limit
  // (§6.3): over-cap picks stay visible while the store still holds them.
  const dimmSlots = Math.min(MAX_DIMM_SLOTS, Math.max(ramMax, ramEntries.length))

  const radSize = numSpecOf(coolingEntry, 'radSizeMm')
  const fanCountSpec = numSpecOf(coolingEntry, 'fanCount')
  const aioFans = coolingEntry
    ? Math.max(1, Math.min(4, Math.trunc(fanCountSpec ?? (radSize ? radSize / 120 : 3))))
    : 0
  const aioFanCx = (i: number, n: number): number =>
    n <= 1 ? 465 : 310 + i * (310 / (n - 1))

  // Heatmap weight per zone: Σ heatmapWeight of its picks vs hottest zone.
  const heatMax = Math.max(1, ...ZONES.map((z) => zoneWatts(z, selections, index)))
  const heat = (zone: StudioZone): number =>
    Math.min(1, picks(zone).reduce((sum, e) => sum + heatmapWeight(e, heatMax), 0))

  const hoverCategory = hoverZone ? catOf(hoverZone) : undefined

  /** A zone is interactive only when a category maps to it (degrade contract). */
  const zoneHandlers = (zone: StudioZone) => {
    const category = catOf(zone)
    if (!category) return { className: 'bp-zone' }
    const activate = () => onZoneClick(category.id)
    return {
      role: 'button' as const,
      tabIndex: 0,
      'data-zone': zone,
      'aria-label': `Swap ${category.name}`,
      className: `bp-zone bp-zone--hit${hoverZone === zone ? ' is-hot' : ''}`,
      onClick: activate,
      onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate()
        }
      },
      onMouseEnter: () => onHoverZone(zone),
      onMouseLeave: () => onHoverZone(null),
      onFocus: () => onHoverZone(zone),
      onBlur: () => onHoverZone(null),
    }
  }

  const cpuTdp = cpuEntry ? wattsOf(cpuEntry) : null
  const gpuLen = numSpecOf(gpuEntry, 'gpuLengthMm')
  const psuRated = numSpecOf(psuEntry, 'psuWatts')
  const moboFactor = textSpecOf(moboEntry, 'moboFormFactor')
  const cpuSocket = textSpecOf(cpuEntry, 'socket')

  const storageLabel = (entry: ComponentSpecEntry): string => {
    const pcie = textSpecOf(entry, 'pcieVersion')
    const iface = textSpecOf(entry, 'storageInterface')
    return [pcie ? `PCIe ${pcie}` : null, iface]
      .filter((p): p is string => Boolean(p))
      .join(' · ') || 'M.2'
  }

  const aioLit = lit(coolingEntry)
  const ramLit = ramEntries.map(lit)
  const gpuLit = lit(gpuEntry)
  const moboLit = lit(moboEntry)
  const psuLit = lit(psuEntry)
  const caseLit = lit(caseEntry)

  return (
    <div className="studio-blueprint" id="schematic-viewport">
      <div className="studio-blueprint__status">
        <span className="studio-blueprint__live">
          <span className="studio-blueprint__ping" aria-hidden="true" />
          Active blueprint
        </span>
        <span className="studio-blueprint__zoneHint">
          {hoverCategory && hoverZone
            ? `${ZONE_LABEL[hoverZone]} — ${hoverCategory.name}`
            : 'Click any zone to swap component'}
        </span>
      </div>

      <svg
        viewBox="0 0 920 680"
        className={`studio-blueprint__svg${xray ? ' is-xray' : ''}`}
        role="group"
        aria-label="Interactive chassis blueprint"
      >
        <defs>
          <filter id="bp-rgb-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="bp-chassis-glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--color-border-strong)', stopOpacity: 0.25 }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-bg)', stopOpacity: 0.4 }} />
          </linearGradient>
        </defs>

        {/* LAYER 0 — chassis ('case' zone) */}
        <g {...zoneHandlers('case')}>
          <rect
            x="140" y="35" width="640" height="610" rx="14"
            className="bp-panel bp-zone-edge"
          />
          <rect x="150" y="45" width="620" height="590" rx="10" className="bp-part" />
          <path d="M 170 75 L 750 75 L 750 615 L 170 615 Z" className="bp-well" />

          {/* Front RGB strip: lights when the case has RGB */}
          <line
            x1="740" y1="75" x2="740" y2="615"
            className="bp-rgb-line"
            strokeWidth={3}
            style={rgbPaint(caseLit, 'stroke')}
            filter={caseLit ? 'url(#bp-rgb-glow)' : undefined}
          />
          <rect x="730" y="75" width="20" height="540" className="bp-part bp-edge-soft" />

          {/* Front fan strip — only when case-fan picks exist (visual, no zone) */}
          {Array.from({ length: Math.min(3, caseFanCount) }).map((_, i) => (
            <g key={i} className="bp-ghost">
              <circle cx="740" cy={200 + i * 140} r="24" className="bp-well bp-edge-soft" />
              <path d={fanBlades(740, 200 + i * 140, 14)} className="bp-fan bp-fan--dim" />
            </g>
          ))}
        </g>

        {/* LAYER 1 — motherboard ('mobo' zone) */}
        <g {...zoneHandlers('mobo')}>
          <rect
            x="220" y="105" width="480" height="435" rx="6"
            className={`bp-part bp-zone-edge${moboEntry ? '' : ' bp-zone-edge--empty'}`}
          />
          <path
            d="M 240 125 H 380 V 205 H 420 M 230 480 H 330 V 420 H 460 M 580 135 V 215 H 510 M 640 260 V 380 H 520"
            fill="none" className="bp-trace"
          />
          {/* VRM heatsinks */}
          <rect x="240" y="125" width="80" height="150" rx="4" className="bp-part-strong bp-edge-soft" />
          <line x1="250" y1="140" x2="310" y2="140" className="bp-rgb-line"
            style={rgbPaint(moboLit, 'stroke')}
            filter={moboLit ? 'url(#bp-rgb-glow)' : undefined}
          />
          <line x1="250" y1="165" x2="310" y2="165" className="bp-rgb-line bp-faint"
            style={rgbPaint(moboLit, 'stroke')}
          />
          <rect x="330" y="120" width="170" height="45" rx="4" className="bp-part-strong bp-edge-soft" />
          {moboFactor ? (
            <text x="415" y="147" textAnchor="middle" className="bp-text-muted bp-t-11 bp-ls2">
              {moboFactor.toUpperCase()}
            </text>
          ) : null}
          {!moboEntry && (
            <text x="460" y="325" textAnchor="middle" className="bp-text-ghost bp-t-10 bp-ls2">
              EMPTY SOCKET
            </text>
          )}
        </g>

        {/* LAYER 2 — CPU socket + pump block ('cpu' zone) */}
        <g {...zoneHandlers('cpu')}>
          <rect
            x="360" y="185" width="130" height="120" rx="8"
            className={`bp-part-strong bp-zone-edge${cpuEntry ? '' : ' bp-zone-edge--empty'}`}
            style={rgbPaint(aioLit, 'stroke')}
          />
          {cpuEntry ? (
            <>
              <circle cx="425" cy="245" r="48" className="bp-well bp-edge-soft" />
              {/* Pump ring — lights only when the cooler has RGB */}
              {coolingEntry && (
                <circle cx="425" cy="245" r="42" className="bp-part"
                  style={rgbPaint(aioLit, 'stroke')}
                  strokeWidth="2.5"
                  filter={aioLit ? 'url(#bp-rgb-glow)' : undefined}
                />
              )}
              <circle cx="425" cy="245" r="34" className="bp-panel" />
              {cpuTdp !== null && cpuTdp > 0 ? (
                <text x="425" y="243" textAnchor="middle" className="bp-text bp-t-16 bp-bold">
                  {cpuTdp}W
                </text>
              ) : null}
              <text x="425" y="258" textAnchor="middle"
                className="bp-text-dim bp-t-8 bp-ls1"
                style={rgbPaint(aioLit, 'fill')}
              >
                {cpuSocket ?? 'CPU'} TDP
              </text>
            </>
          ) : (
            <text x="425" y="250" textAnchor="middle" className="bp-text-ghost bp-t-10 bp-ls2">
              CPU SOCKET
            </text>
          )}
          {/* Braided tubes — only when the cooler is installed */}
          {coolingEntry && (
            <>
              <path d="M 450 210 C 470 145, 480 85, 520 80" fill="none" className="bp-tube" />
              <path d="M 450 210 C 470 145, 480 85, 520 80" fill="none"
                className="bp-cable bp-cable--flow"
                style={rgbPaint(aioLit, 'stroke')}
              />
              <path d="M 410 205 C 390 140, 410 85, 460 80" fill="none" className="bp-tube" />
              <path d="M 410 205 C 390 140, 410 85, 460 80" fill="none"
                className="bp-cable bp-cable--flow"
                style={rgbPaint(aioLit, 'stroke')}
              />
            </>
          )}
        </g>

        {/* LAYER 3 — RAM DIMMs ('ram' zone, multi-pick) */}
        <g {...zoneHandlers('ram')}>
          {Array.from({ length: dimmSlots }).map((_, i) => {
            const pick = ramEntries[i]
            const dimmLit = ramLit[i] ?? false
            const socketX = DIMM_X - 13 + i * DIMM_PITCH
            const dimmX = DIMM_X + i * DIMM_PITCH
            return (
              <g key={i}>
                <rect x={socketX} y="175" width="8" height="140" rx="1.5"
                  className="bp-part-strong bp-faint"
                />
                <rect
                  x={dimmX} y="167" width="11" height="156" rx="2"
                  className={`bp-part-strong bp-zone-edge${pick ? '' : ' bp-zone-edge--empty'}`}
                />
                {pick && (
                  <rect x={dimmX + 2} y="168" width="7" height="38" rx="1.5"
                    className="bp-rgb-fill"
                    style={rgbPaint(dimmLit, 'fill')}
                    filter={dimmLit ? 'url(#bp-rgb-glow)' : undefined}
                  />
                )}
              </g>
            )
          })}
          {ramEntries.length === 0 && dimmSlots === 0 && (
            <text x="575" y="245" textAnchor="middle" className="bp-text-ghost bp-t-10 bp-ls2">
              DIMM
            </text>
          )}
        </g>

        {/* LAYER 4 — radiator + fans ('aio' zone ← 'cooling' slug) */}
        <g {...zoneHandlers('aio')}>
          <rect
            x="230" y="55" width="470" height="44" rx="4"
            className={`bp-part-strong bp-zone-edge${coolingEntry ? '' : ' bp-zone-edge--empty'}`}
          />
          {Array.from({ length: aioFans }).map((_, i) => {
            const cx = aioFanCx(i, aioFans)
            return (
              <g key={i}>
                <circle cx={cx} cy="77" r="17" className="bp-panel"
                  style={rgbPaint(aioLit, 'stroke')}
                  strokeWidth="2.5"
                  filter={aioLit ? 'url(#bp-rgb-glow)' : undefined}
                />
                <path d={fanBlades(cx, 77, 13)} className="bp-fan"
                  style={rgbPaint(aioLit, 'stroke')}
                />
              </g>
            )
          })}
          {radSize ? (
            <text x="465" y="95" textAnchor="middle" className="bp-text-muted bp-t-8 bp-ls1">
              {radSize}MM RAD
            </text>
          ) : null}
        </g>

        {/* M.2 shields — up to 2, above the mobo ('storage' zone) */}
        <g {...zoneHandlers('storage')}>
          {[0, 1].map((slot) => {
            const pick = storageEntries[slot]
            const y = 325 + slot * 40
            if (!pick && slot >= Math.max(1, storageEntries.length)) return null
            return (
              <g key={slot}>
                <rect
                  x="350" y={y} width="220" height="32" rx="3"
                  className={`bp-part-strong bp-zone-edge${pick ? '' : ' bp-zone-edge--empty'}`}
                />
                <circle cx="365" cy={y + 16} r="3"
                  className="bp-accent-fill"
                  style={rgbPaint(lit(pick), 'fill')}
                />
                <text x="378" y={y + 20} className="bp-text-dim bp-t-9">
                  {pick ? storageLabel(pick) : 'M.2 SOCKET'}
                </text>
              </g>
            )
          })}
        </g>

        {/* LAYER 5 — GPU ('gpu' zone) */}
        <g {...zoneHandlers('gpu')}>
          <rect
            x="200" y="375" width="510" height="120" rx="8"
            className={`bp-part-strong bp-zone-edge${gpuEntry ? '' : ' bp-zone-edge--empty'}`}
          />
          {gpuEntry ? (
            <>
              <path d="M 210 382 L 700 382 L 690 390 L 220 390 Z"
                className="bp-rgb-fill"
                style={rgbPaint(gpuLit, 'fill')}
                filter={gpuLit ? 'url(#bp-rgb-glow)' : undefined}
              />
              {[290, 455, 620].map((cx) => (
                <g key={cx} transform={`translate(${cx}, 435)`}>
                  <circle cx="0" cy="0" r="42" className="bp-well bp-edge-soft" />
                  <circle cx="0" cy="0" r="38" className="bp-part"
                    style={rgbPaint(gpuLit, 'stroke')}
                    strokeDasharray="14,6" strokeWidth="1.5"
                  />
                  <circle cx="0" cy="0" r="14" className="bp-part-strong" />
                  <circle cx="0" cy="0" r="4" className="bp-rgb-fill"
                    style={rgbPaint(gpuLit, 'fill')}
                  />
                </g>
              ))}
              <rect x="210" y="475" width="105" height="15" rx="2" className="bp-well" />
              <text x="220" y="486" className="bp-text-dim bp-t-8 bp-bold bp-ls1"
                style={rgbPaint(gpuLit, 'fill')}
              >
                {gpuLen !== null ? `LENGTH ${gpuLen} MM` : 'GPU'}
              </text>
            </>
          ) : (
            <text x="455" y="442" textAnchor="middle" className="bp-text-ghost bp-t-10 bp-ls2">
              GPU SLOT
            </text>
          )}
        </g>

        {/* Cable harness to the GPU */}
        {gpuEntry && (
          <g className="bp-faint" aria-hidden="true">
            <path d="M 455 495 C 455 525, 480 545, 520 548" fill="none" className="bp-tube" />
            <path d="M 455 495 C 455 525, 480 545, 520 548" fill="none"
              className="bp-cable" strokeDasharray="3,3"
              style={rgbPaint(gpuLit, 'stroke')}
            />
          </g>
        )}

        {/* LAYER 7 — PSU shroud ('psu' zone) */}
        <g {...zoneHandlers('psu')}>
          <rect
            x="170" y="530" width="560" height="85" rx="4"
            className={`bp-part bp-zone-edge${psuEntry ? '' : ' bp-zone-edge--empty'}`}
          />
          <line x1="185" y1="550" x2="350" y2="550" className="bp-vent" />
          <line x1="185" y1="570" x2="350" y2="570" className="bp-vent" />
          <line x1="185" y1="590" x2="350" y2="590" className="bp-vent" />
          {psuEntry ? (
            <>
              <rect x="380" y="545" width="200" height="52" rx="4" className="bp-well"
                style={rgbPaint(psuLit, 'stroke')}
                strokeWidth="1.5"
                filter={psuLit ? 'url(#bp-rgb-glow)' : undefined}
              />
              <circle cx="395" cy="560" r="3" className="bp-rgb-fill"
                style={rgbPaint(psuLit, 'fill')}
              />
              <text x="406" y="563" className="bp-text-muted bp-t-9">
                {(psuEntry.display?.name ?? 'PSU').toUpperCase()}
              </text>
              <text x="406" y="586" className="bp-text-dim bp-t-18 bp-bold"
                style={rgbPaint(psuLit, 'fill')}
              >
                {psuRated !== null ? `${psuRated}W` : 'PSU'}
              </text>
              <text x="475" y="584" className="bp-text-dim bp-t-10">
                LOAD {result.recommendedPsuWatts}W
              </text>
            </>
          ) : (
            <text x="450" y="578" textAnchor="middle" className="bp-text-ghost bp-t-10 bp-ls2">
              PSU BAY
            </text>
          )}
        </g>

        {/* LAYER 8 — heatmap overlay (real tdpWatts/max zone weights) */}
        {heatmap && (
          <g className="bp-heat-layer" aria-hidden="true">
            {ZONES.map((zone) => {
              const w = heat(zone)
              if (w <= 0) return null
              const b = ZONE_HEAT_BOUNDS[zone]
              return (
                <rect
                  key={zone}
                  x={b.x} y={b.y} width={b.w} height={b.h} rx="8"
                  className="bp-heat"
                  style={heatOpacity(w)}
                />
              )
            })}
          </g>
        )}

        {/* Tempered glass reflection */}
        <polygon
          points="170,75 500,75 350,615 170,615"
          fill="url(#bp-chassis-glass)"
          pointerEvents="none"
        />
      </svg>
    </div>
  )
}
