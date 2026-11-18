'use client'

import React, { useState } from 'react'
import {
  Droplets,
  Layers,
  Gauge,
  Sparkles,
  Check,
} from 'lucide-react'

type CoolantStyle = {
  id: string
  name: string
  color: string
  glow: string
  accentClass: string
}

const COOLANTS: CoolantStyle[] = [
  { id: 'cyan', name: 'Cryo Cyan Non-Conductive', color: 'var(--color-info)', glow: 'var(--color-info-soft)', accentClass: 'ae-u-text-accent' },
  { id: 'amber', name: 'Amber Gold Telemetry', color: 'var(--color-primary)', glow: 'var(--color-primary-glow)', accentClass: 'ae-u-text-primary' },
  { id: 'clear', name: 'Pure Distilled Clear', color: 'var(--color-text)', glow: 'var(--color-surface-hover)', accentClass: 'ae-u-text-strong' },
  { id: 'emerald', name: 'UV Reactive Emerald', color: 'var(--color-success)', glow: 'var(--color-success-soft)', accentClass: 'ae-u-text-success' },
]

type TubingStyle = {
  id: string
  name: string
  finish: string
  borderColor: string
  bgOpacity: string
}

const TUBINGS: TubingStyle[] = [
  { id: 'brass', name: 'Mirror Polished Brass', finish: 'Seamless 14mm Brass Hardline', borderColor: 'var(--color-primary-strong)', bgOpacity: 'var(--color-primary-soft)' },
  { id: 'acrylic', name: 'Frosted Hardline Acrylic', finish: '16mm Satin Matte PMMA', borderColor: 'var(--color-info)', bgOpacity: 'var(--color-info-soft)' },
  { id: 'epdm', name: 'Industrial Matte Black EPDM', finish: 'Zero-Maintenance Zero-Permeation', borderColor: 'var(--color-border-strong)', bgOpacity: 'var(--color-surface-hover)' },
]

export function AetherLoopVisualizerClient({
  eyebrow,
  heading,
  subtitle,
  defaultCoolant = 'cyan',
  defaultTubing = 'brass',
  showFlowRateControl = true,
}: {
  eyebrow?: string
  heading: string
  subtitle?: string
  defaultCoolant?: string
  defaultTubing?: string
  showFlowRateControl?: boolean
}) {
  const [coolant, setCoolant] = useState<CoolantStyle>(
    COOLANTS.find((c) => c.id === defaultCoolant) ?? COOLANTS[0],
  )
  const [tubing, setTubing] = useState<TubingStyle>(
    TUBINGS.find((t) => t.id === defaultTubing) ?? TUBINGS[0],
  )
  const [flowRate, setFlowRate] = useState<number>(2.4)
  const [activeStation, setActiveStation] = useState<'manifold' | 'cpu' | 'gpu' | 'pump'>('manifold')

  // Flow animation speed based on flowRate
  const animationDuration = `${Math.max(0.8, Number((3.6 / flowRate).toFixed(2)))}s`

  return (
    <div className="ae-lab ae-u-my-8">
      <div className="ae-lab__header ae-u-text-center ae-u-mb-8">
        {eyebrow ? <p className="ae-lab__eyebrow">{eyebrow}</p> : null}
        <h2 className="ae-lab__heading">{heading}</h2>
        {subtitle ? <p className="ae-lab__subtitle">{subtitle}</p> : null}
      </div>

      <div className="ae-u-grid ae-u-grid-cols-1 ae-u-lg-grid-cols-12 ae-u-gap-8">
        {/* Schematic Loop Visualizer Canvas */}
        <div className="ae-u-lg-col-span-7 ae-u-rounded-xl ae-u-border ae-u-p-6 ae-u-flex ae-u-flex-col ae-u-justify-between ae-u-bg-surface">
          <div>
            <div className="ae-u-flex ae-u-items-center ae-u-justify-between ae-u-mb-4 ae-u-border-b ae-u-pb-3">
              <div className="ae-u-flex ae-u-items-center ae-u-gap-2">
                <Gauge size={16} className={coolant.accentClass} />
                <span className="ae-u-font-mono ae-u-text-xs ae-u-font-bold ae-u-uppercase ae-u-text-strong">
                  CAD Manifold Schematic // Live Fluid Path
                </span>
              </div>
              <div className="ae-u-flex ae-u-items-center ae-u-gap-2 ae-u-font-mono ae-u-text-11 ae-u-text-muted">
                <span>PRESSURE:</span>
                <span className="ae-u-text-strong ae-u-font-bold">1.48 BAR</span>
                <span className="ae-u-text-subtle">|</span>
                <span>FLOW:</span>
                <span className={coolant.accentClass} style={{ fontWeight: 'bold' }}>{flowRate} L/min</span>
              </div>
            </div>

            {/* Simulated Liquid Loop Diagram */}
            <div className="ae-u-relative ae-u-h-64 ae-u-w-full ae-u-rounded-lg ae-u-border ae-u-flex ae-u-items-center ae-u-justify-center ae-u-overflow-hidden ae-u-my-4 ae-u-bg-surface-hover">
              {/* Fluid Glow Background Accent */}
              <div
                className="ae-u-absolute ae-u-inset-0 ae-u-opacity-20 ae-u-pointer-events-none ae-u-transition-all ae-u-duration-500"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${coolant.color}, transparent 70%)`,
                }}
              />

              {/* Loop Schematic SVG */}
              <svg className="ae-u-w-full ae-u-h-full ae-u-max-w-md ae-u-p-4" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer Tubing Path */}
                <rect
                  x="40"
                  y="30"
                  width="320"
                  height="140"
                  rx="16"
                  stroke={tubing.borderColor}
                  strokeWidth="8"
                  strokeOpacity="0.8"
                />

                {/* Animated Coolant Core Stream */}
                <rect
                  x="40"
                  y="30"
                  width="320"
                  height="140"
                  rx="16"
                  stroke={coolant.color}
                  strokeWidth="3"
                  strokeDasharray="16 12"
                  style={{
                    filter: `drop-shadow(0 0 6px ${coolant.glow})`,
                    animation: `dash ${animationDuration} linear infinite`,
                  }}
                />

                {/* CPU Coldplate Node */}
                <g onClick={() => setActiveStation('cpu')} className="ae-u-cursor-pointer">
                  <rect x="70" y="70" width="60" height="60" rx="8" fill="var(--color-surface-raised)" stroke={activeStation === 'cpu' ? coolant.color : 'var(--color-border)'} strokeWidth="2" />
                  <text x="100" y="98" fill="var(--color-text)" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">CPU DIE</text>
                  <text x="100" y="112" fill={coolant.color} fontSize="8" textAnchor="middle" fontFamily="monospace">DELID</text>
                </g>

                {/* Central Manifold Node */}
                <g onClick={() => setActiveStation('manifold')} className="ae-u-cursor-pointer">
                  <rect x="170" y="55" width="60" height="90" rx="8" fill="var(--color-surface-raised)" stroke={activeStation === 'manifold' ? coolant.color : 'var(--color-border)'} strokeWidth="2" />
                  <text x="200" y="95" fill="var(--color-text)" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">MANIFOLD</text>
                  <text x="200" y="110" fill="var(--color-text-muted)" fontSize="7" textAnchor="middle" fontFamily="monospace">DISTRO</text>
                </g>

                {/* GPU Waterblock Node */}
                <g onClick={() => setActiveStation('gpu')} className="ae-u-cursor-pointer">
                  <rect x="270" y="70" width="60" height="60" rx="8" fill="var(--color-surface-raised)" stroke={activeStation === 'gpu' ? coolant.color : 'var(--color-border)'} strokeWidth="2" />
                  <text x="300" y="98" fill="var(--color-text)" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">RTX 5090</text>
                  <text x="300" y="112" fill={coolant.color} fontSize="8" textAnchor="middle" fontFamily="monospace">600W</text>
                </g>
              </svg>

              <style jsx>{`
                @keyframes dash {
                  to {
                    stroke-dashoffset: -28;
                  }
                }
              `}</style>
            </div>

            {/* Station Detail Box */}
            <div className="ae-u-rounded ae-u-border ae-u-p-3 ae-u-text-xs ae-u-font-mono ae-u-bg-surface-hover">
              <div className="ae-u-flex ae-u-items-center ae-u-justify-between ae-u-text-muted ae-u-mb-1">
                <span>INSPECTION TARGET:</span>
                <span className="ae-u-text-strong ae-u-font-bold ae-u-uppercase">{activeStation} COMPONENT ZONE</span>
              </div>
              <p className="ae-u-text-muted ae-u-text-11 ae-u-leading-relaxed">
                {activeStation === 'manifold' && 'CNC-machined clear acrylic distribution block with integrated G1/4" pressure relief valve and air bleed port.'}
                {activeStation === 'cpu' && 'Direct-die liquid metal coldplate with micro-channel jet impingement plate, zero solder thermal resistance.'}
                {activeStation === 'gpu' && 'Monolithic electrolytic copper coldplate spanning GPU core, GDDR7 modules, and DrMOS power stages.'}
                {activeStation === 'pump' && 'Dual D5 PWM pumps in series redundancy, delivering 3.8 L/min peak flow against 4.2m head pressure.'}
              </p>
            </div>
          </div>

          <div className="ae-u-border-t ae-u-pt-3 ae-u-mt-4 ae-u-flex ae-u-items-center ae-u-justify-between ae-u-text-11 ae-u-font-mono ae-u-text-subtle">
            <span>TUBE FINISH: {tubing.finish}</span>
            <span className={coolant.accentClass}>{coolant.name}</span>
          </div>
        </div>

        {/* Right Column: Customization Controls */}
        <div className="ae-u-lg-col-span-5 ae-u-rounded-xl ae-u-border ae-u-p-6 ae-u-flex ae-u-flex-col ae-u-justify-between ae-u-bg-surface">
          <div>
            <div className="ae-u-flex ae-u-items-center ae-u-gap-2 ae-u-mb-6 ae-u-font-mono ae-u-text-xs ae-u-uppercase ae-u-tracking-wider ae-u-text-primary ae-u-font-bold">
              <Sparkles size={16} />
              <span>Fluid & Metallurgy Specification</span>
            </div>

            {/* Coolant Selector */}
            <div className="ae-u-mb-6">
              <label className="ae-u-block ae-u-font-mono ae-u-text-xs ae-u-text-muted ae-u-mb-2 ae-u-flex ae-u-items-center ae-u-gap-1_5">
                <Droplets size={14} />
                <span>Sub-Ambient Coolant Fluid</span>
              </label>
              <div className="ae-u-space-y-2">
                {COOLANTS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCoolant(c)}
                    className="ae-u-w-full ae-u-flex ae-u-items-center ae-u-justify-between ae-u-rounded ae-u-border ae-u-p-3 ae-u-text-xs ae-u-transition"
                    style={{
                      borderColor: coolant.id === c.id ? c.color : 'var(--color-border)',
                      backgroundColor: coolant.id === c.id ? 'var(--color-surface-hover)' : 'transparent',
                    }}
                  >
                    <div className="ae-u-flex ae-u-items-center ae-u-gap-2_5">
                      <span className="ae-u-h-3 ae-u-w-3 ae-u-rounded-full ae-u-shadow-sm" style={{ backgroundColor: c.color }} />
                      <span className="ae-u-font-bold ae-u-text-strong">{c.name}</span>
                    </div>
                    {coolant.id === c.id ? <Check size={14} className={c.accentClass} /> : null}
                  </button>
                ))}
              </div>
            </div>

            {/* Tubing Metallurgy */}
            <div className="ae-u-mb-6">
              <label className="ae-u-block ae-u-font-mono ae-u-text-xs ae-u-text-muted ae-u-mb-2 ae-u-flex ae-u-items-center ae-u-gap-1_5">
                <Layers size={14} />
                <span>Hardline & Metallurgy Profile</span>
              </label>
              <div className="ae-u-space-y-2">
                {TUBINGS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTubing(t)}
                    className="ae-u-w-full ae-u-flex ae-u-items-center ae-u-justify-between ae-u-rounded ae-u-border ae-u-p-3 ae-u-text-xs ae-u-transition ae-u-text-left"
                    style={{
                      borderColor: tubing.id === t.id ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: tubing.id === t.id ? 'var(--color-surface-hover)' : 'transparent',
                    }}
                  >
                    <div>
                      <div className="ae-u-font-bold ae-u-text-strong">{t.name}</div>
                      <div className="ae-u-text-11 ae-u-text-subtle ae-u-font-mono ae-u-mt-0_5">{t.finish}</div>
                    </div>
                    {tubing.id === t.id ? <Check size={14} className="ae-u-text-primary" /> : null}
                  </button>
                ))}
              </div>
            </div>

            {/* Flow Rate Control */}
            {showFlowRateControl ? (
              <div className="ae-u-mb-4">
                <div className="ae-u-flex ae-u-justify-between ae-u-items-center ae-u-mb-1_5">
                  <span className="ae-u-font-mono ae-u-text-xs ae-u-text-muted">PWM Flow Velocity</span>
                  <span className="ae-u-font-mono ae-u-text-xs ae-u-text-primary ae-u-font-bold">{flowRate} L/min</span>
                </div>
                <div className="ae-u-grid ae-u-grid-cols-3 ae-u-gap-2">
                  {[
                    { label: 'Quiet', rate: 1.4 },
                    { label: 'Balanced', rate: 2.4 },
                    { label: 'Max Flow', rate: 3.8 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFlowRate(p.rate)}
                      className="ae-u-rounded ae-u-border ae-u-py-2 ae-u-text-xs ae-u-font-mono ae-u-font-semibold ae-u-transition"
                      style={{
                        borderColor: flowRate === p.rate ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: flowRate === p.rate ? 'var(--color-surface-hover)' : 'transparent',
                        color: flowRate === p.rate ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="ae-u-border-t ae-u-pt-4 ae-u-text-xs ae-u-font-mono ae-u-text-subtle ae-u-flex ae-u-justify-between">
            <span>HYDROSTATIC TESTING: PASSED</span>
            <span className="ae-u-text-success">LEAK-SHIELD ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
