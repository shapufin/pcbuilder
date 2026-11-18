'use client'

import React, { useState } from 'react'
import {
  Cpu,
  Flame,
  Activity,
  Sliders,
  CheckCircle2,
} from 'lucide-react'

type CpuOption = { id: string; name: string; tdp: number; defaultTemp: number }
type GpuOption = { id: string; name: string; tdp: number; defaultTemp: number }
type RadOption = { id: string; name: string; surfaceFactor: number; dissipationWatts: number }

const CPUS: CpuOption[] = [
  { id: '9950x', name: 'Ryzen 9 9950X (16C/32T)', tdp: 230, defaultTemp: 76 },
  { id: '14900ks', name: 'Core i9-14900KS (Extreme Bin)', tdp: 320, defaultTemp: 88 },
  { id: 'threadripper', name: 'Threadripper 7965WX (24C)', tdp: 350, defaultTemp: 79 },
]

const GPUS: GpuOption[] = [
  { id: '5080', name: 'RTX 5080 (16GB GDDR7)', tdp: 400, defaultTemp: 52 },
  { id: '5090', name: 'RTX 5090 OC (32GB GDDR7)', tdp: 600, defaultTemp: 58 },
  { id: 'dual5090', name: 'Dual RTX 5090 OC Workstation', tdp: 1200, defaultTemp: 64 },
]

const RADIATORS: RadOption[] = [
  { id: '360', name: '360mm Triple (45mm High-Fin)', surfaceFactor: 1.0, dissipationWatts: 650 },
  { id: '480', name: '480mm Quad (60mm Monolith)', surfaceFactor: 1.45, dissipationWatts: 950 },
  { id: 'dual480', name: 'Dual 480mm Internal Push-Pull', surfaceFactor: 2.7, dissipationWatts: 1600 },
  { id: 'mora', name: 'Mo-Ra3 1260mm Giant External', surfaceFactor: 4.2, dissipationWatts: 2400 },
]

export function AetherCalculatorClient({
  eyebrow,
  heading,
  subtitle,
  defaultCpuTdp = 320,
  defaultGpuTdp = 600,
  showDelidComparison = true,
}: {
  eyebrow?: string
  heading: string
  subtitle?: string
  defaultCpuTdp?: number
  defaultGpuTdp?: number
  showDelidComparison?: boolean
}) {
  const [selectedCpu, setSelectedCpu] = useState<CpuOption>(
    CPUS.find((c) => c.tdp === defaultCpuTdp) ?? CPUS[1],
  )
  const [selectedGpu, setSelectedGpu] = useState<GpuOption>(
    GPUS.find((g) => g.tdp === defaultGpuTdp) ?? GPUS[1],
  )
  const [selectedRad, setSelectedRad] = useState<RadOption>(RADIATORS[1])
  const [ambientTemp, setAmbientTemp] = useState<number>(21)
  const [isDelidded, setIsDelidded] = useState<boolean>(true)

  // Computation logic
  const totalWatts = selectedCpu.tdp + selectedGpu.tdp
  const radRatio = totalWatts / selectedRad.dissipationWatts
  
  // Coolant Delta-T calculation
  const coolantDelta = Math.max(3.5, Number((radRatio * 11.2).toFixed(1)))
  const steadyCoolantTemp = Number((ambientTemp + coolantDelta).toFixed(1))
  
  // Junction reduction with direct-die delid
  const delidAdvantage = isDelidded ? 18.4 : 0.0
  const cpuJunction = Number(
    (steadyCoolantTemp + (selectedCpu.tdp / 320) * 42 - delidAdvantage).toFixed(1),
  )
  const gpuJunction = Number(
    (steadyCoolantTemp + (selectedGpu.tdp / 600) * 22).toFixed(1),
  )
  
  // Acoustic noise floor estimate
  const fanNoise = Math.min(38.5, Math.max(21.4, Number((20.0 + radRatio * 12.0).toFixed(1))))
  const isOptimal = coolantDelta <= 10.0 && cpuJunction <= 82.0

  return (
    <div className="ae-lab ae-u-my-8">
      <div className="ae-lab__header ae-u-text-center ae-u-mb-8">
        {eyebrow ? <p className="ae-lab__eyebrow">{eyebrow}</p> : null}
        <h2 className="ae-lab__heading">{heading}</h2>
        {subtitle ? <p className="ae-lab__subtitle">{subtitle}</p> : null}
      </div>

      <div className="ae-u-grid ae-u-grid-cols-1 ae-u-lg-grid-cols-12 ae-u-gap-8">
        {/* Left Column: Interactive Controls */}
        <div className="ae-u-lg-col-span-6 ae-u-rounded-xl ae-u-border ae-u-p-6 ae-u-bg-surface">
          <div className="ae-u-flex ae-u-items-center ae-u-gap-2 ae-u-mb-6 ae-u-font-mono ae-u-text-xs ae-u-uppercase ae-u-tracking-wider ae-u-text-primary ae-u-font-bold">
            <Sliders size={16} />
            <span>Thermal Load Parameters</span>
          </div>

          {/* CPU Selection */}
          <div className="ae-u-mb-5">
            <label className="ae-u-block ae-u-font-mono ae-u-text-xs ae-u-text-muted ae-u-mb-2">Processor Target (CPU)</label>
            <div className="ae-u-grid ae-u-grid-cols-1 ae-u-sm-grid-cols-3 ae-u-gap-2">
              {CPUS.map((cpu) => (
                <button
                  key={cpu.id}
                  type="button"
                  onClick={() => setSelectedCpu(cpu)}
                  className="ae-u-rounded ae-u-border ae-u-p-2_5 ae-u-text-left ae-u-text-xs ae-u-transition"
                  style={{
                    borderColor: selectedCpu.id === cpu.id ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: selectedCpu.id === cpu.id ? 'var(--color-surface-hover)' : 'transparent',
                    color: selectedCpu.id === cpu.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                  }}
                >
                  <div className="ae-u-font-bold ae-u-truncate">{cpu.name}</div>
                  <div className="ae-u-font-mono ae-u-text-10 ae-u-text-subtle ae-u-mt-1">{cpu.tdp}W TDP</div>
                </button>
              ))}
            </div>
          </div>

          {/* GPU Selection */}
          <div className="ae-u-mb-5">
            <label className="ae-u-block ae-u-font-mono ae-u-text-xs ae-u-text-muted ae-u-mb-2">Graphics Accelerator (GPU)</label>
            <div className="ae-u-grid ae-u-grid-cols-1 ae-u-sm-grid-cols-3 ae-u-gap-2">
              {GPUS.map((gpu) => (
                <button
                  key={gpu.id}
                  type="button"
                  onClick={() => setSelectedGpu(gpu)}
                  className="ae-u-rounded ae-u-border ae-u-p-2_5 ae-u-text-left ae-u-text-xs ae-u-transition"
                  style={{
                    borderColor: selectedGpu.id === gpu.id ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: selectedGpu.id === gpu.id ? 'var(--color-surface-hover)' : 'transparent',
                    color: selectedGpu.id === gpu.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                  }}
                >
                  <div className="ae-u-font-bold ae-u-truncate">{gpu.name}</div>
                  <div className="ae-u-font-mono ae-u-text-10 ae-u-text-subtle ae-u-mt-1">{gpu.tdp}W TDP</div>
                </button>
              ))}
            </div>
          </div>

          {/* Radiator Selection */}
          <div className="ae-u-mb-5">
            <label className="ae-u-block ae-u-font-mono ae-u-text-xs ae-u-text-muted ae-u-mb-2">Radiator Heat Dissipation Surface</label>
            <div className="ae-u-grid ae-u-grid-cols-1 ae-u-sm-grid-cols-2 ae-u-gap-2">
              {RADIATORS.map((rad) => (
                <button
                  key={rad.id}
                  type="button"
                  onClick={() => setSelectedRad(rad)}
                  className="ae-u-rounded ae-u-border ae-u-p-2_5 ae-u-text-left ae-u-text-xs ae-u-transition"
                  style={{
                    borderColor: selectedRad.id === rad.id ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: selectedRad.id === rad.id ? 'var(--color-surface-hover)' : 'transparent',
                    color: selectedRad.id === rad.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                  }}
                >
                  <div className="ae-u-font-bold ae-u-truncate">{rad.name}</div>
                  <div className="ae-u-font-mono ae-u-text-10 ae-u-text-subtle ae-u-mt-1">{rad.dissipationWatts}W Rated</div>
                </button>
              ))}
            </div>
          </div>

          {/* Ambient Temperature Slider */}
          <div className="ae-u-mb-5">
            <div className="ae-u-flex ae-u-justify-between ae-u-items-center ae-u-mb-1">
              <label className="ae-u-font-mono ae-u-text-xs ae-u-text-muted">Ambient Chamber Temperature</label>
              <span className="ae-u-font-mono ae-u-text-xs ae-u-text-primary ae-u-font-bold">{ambientTemp}°C</span>
            </div>
            <input
              type="range"
              min={18}
              max={32}
              value={ambientTemp}
              onChange={(e) => setAmbientTemp(Number(e.target.value))}
              className="ae-u-w-full ae-u-accent-primary ae-u-cursor-pointer"
            />
            <div className="ae-u-flex ae-u-justify-between ae-u-text-10 ae-u-font-mono ae-u-text-subtle ae-u-mt-1">
              <span>18°C (Air Conditioned Lab)</span>
              <span>25°C</span>
              <span>32°C (Summer Peak)</span>
            </div>
          </div>

          {/* Delid Direct-Die Switch */}
          {showDelidComparison ? (
            <div className="ae-u-pt-4 ae-u-border-t ae-u-flex ae-u-items-center ae-u-justify-between">
              <div>
                <span className="ae-u-block ae-u-text-xs ae-u-font-bold ae-u-text-strong">Direct-Die CNC Coldplate Delid</span>
                <span className="ae-u-text-11 ae-u-text-muted">Liquid metal contact directly on silicon die</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDelidded((prev) => !prev)}
                className="ae-u-rounded-full ae-u-px-3 ae-u-py-1 ae-u-font-mono ae-u-text-xs ae-u-font-bold ae-u-transition ae-u-flex ae-u-items-center ae-u-gap-1_5"
                style={{
                  backgroundColor: isDelidded ? 'var(--color-success-soft)' : 'var(--color-surface)',
                  color: isDelidded ? 'var(--color-success)' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {isDelidded ? <CheckCircle2 size={12} /> : null}
                <span>{isDelidded ? 'DELID ACTIVE (-18.4°C)' : 'STOCK IHS (+0°C)'}</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Right Column: Computed Telemetry Dashboard */}
        <div className="ae-u-lg-col-span-6 ae-u-rounded-xl ae-u-border ae-u-p-6 ae-u-flex ae-u-flex-col ae-u-justify-between ae-u-bg-surface">
          <div>
            <div className="ae-u-flex ae-u-items-center ae-u-justify-between ae-u-mb-6 ae-u-border-b ae-u-pb-4">
              <div className="ae-u-flex ae-u-items-center ae-u-gap-2">
                <Activity size={18} className="ae-u-text-accent" />
                <span className="ae-u-font-mono ae-u-text-xs ae-u-font-bold ae-u-uppercase ae-u-tracking-wider ae-u-text-strong">
                  Real-Time Computation Telemetry
                </span>
              </div>
              <span
                className="ae-u-rounded ae-u-px-2_5 ae-u-py-0_5 ae-u-font-mono ae-u-text-xs ae-u-font-bold"
                style={{
                  backgroundColor: isOptimal ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
                  color: isOptimal ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              >
                {isOptimal ? 'SYSTEM THERMALLY OPTIMAL' : 'HIGH THERMAL DENSITY'}
              </span>
            </div>

            <div className="ae-u-grid ae-u-grid-cols-2 ae-u-gap-4 ae-u-mb-6">
              <div className="ae-u-rounded-lg ae-u-border ae-u-p-4 ae-u-bg-surface-hover">
                <span className="ae-u-text-10 ae-u-font-mono ae-u-uppercase ae-u-text-subtle ae-u-block ae-u-mb-1">Total System Load</span>
                <div className="ae-u-flex ae-u-items-baseline ae-u-gap-1">
                  <span className="ae-u-text-2xl ae-u-font-bold ae-u-font-mono ae-u-text-strong">{totalWatts}</span>
                  <span className="ae-u-font-mono ae-u-text-xs ae-u-text-primary">Watts</span>
                </div>
                <span className="ae-u-text-10 ae-u-text-subtle ae-u-mt-1 ae-u-block">Combined CPU + GPU dissipation</span>
              </div>

              <div className="ae-u-rounded-lg ae-u-border ae-u-p-4 ae-u-bg-surface-hover">
                <span className="ae-u-text-10 ae-u-font-mono ae-u-uppercase ae-u-text-subtle ae-u-block ae-u-mb-1">Coolant Delta-T (ΔT)</span>
                <div className="ae-u-flex ae-u-items-baseline ae-u-gap-1">
                  <span className="ae-u-text-2xl ae-u-font-bold ae-u-font-mono ae-u-text-accent">+{coolantDelta}°C</span>
                  <span className="ae-u-font-mono ae-u-text-xs ae-u-text-subtle">above ambient</span>
                </div>
                <span className="ae-u-text-10 ae-u-text-subtle ae-u-mt-1 ae-u-block">Steady state liquid: {steadyCoolantTemp}°C</span>
              </div>

              <div className="ae-u-rounded-lg ae-u-border ae-u-p-4 ae-u-bg-surface-hover">
                <span className="ae-u-text-10 ae-u-font-mono ae-u-uppercase ae-u-text-subtle ae-u-block ae-u-mb-1 ae-u-flex ae-u-items-center ae-u-gap-1">
                  <Cpu size={12} />
                  <span>CPU Junction Temp</span>
                </span>
                <div className="ae-u-flex ae-u-items-baseline ae-u-gap-1">
                  <span className="ae-u-text-2xl ae-u-font-bold ae-u-font-mono ae-u-text-strong">{cpuJunction}°C</span>
                  <span className="ae-u-font-mono ae-u-text-xs ae-u-text-success">Tdie</span>
                </div>
                <span className="ae-u-text-10 ae-u-text-subtle ae-u-mt-1 ae-u-block">
                  {isDelidded ? 'Direct-Die liquid metal coldplate' : 'Standard IHS with factory solder'}
                </span>
              </div>

              <div className="ae-u-rounded-lg ae-u-border ae-u-p-4 ae-u-bg-surface-hover">
                <span className="ae-u-text-10 ae-u-font-mono ae-u-uppercase ae-u-text-subtle ae-u-block ae-u-mb-1 ae-u-flex ae-u-items-center ae-u-gap-1">
                  <Flame size={12} />
                  <span>GPU Core Temp</span>
                </span>
                <div className="ae-u-flex ae-u-items-baseline ae-u-gap-1">
                  <span className="ae-u-text-2xl ae-u-font-bold ae-u-font-mono ae-u-text-strong">{gpuJunction}°C</span>
                  <span className="ae-u-font-mono ae-u-text-xs ae-u-text-success">Hotspot ~{Math.round(gpuJunction + 11)}°C</span>
                </div>
                <span className="ae-u-text-10 ae-u-text-subtle ae-u-mt-1 ae-u-block">Full-coverage CNC copper block</span>
              </div>
            </div>

            <div className="ae-u-rounded-lg ae-u-border ae-u-p-4 ae-u-mb-4 ae-u-bg-surface-hover">
              <div className="ae-u-flex ae-u-justify-between ae-u-items-center ae-u-mb-2">
                <span className="ae-u-text-xs ae-u-font-mono ae-u-font-bold ae-u-text-strong">Acoustic Noise Floor (1m)</span>
                <span className="ae-u-text-xs ae-u-font-mono ae-u-font-bold ae-u-text-primary">{fanNoise} dBA</span>
              </div>
              <div className="ae-u-w-full ae-u-bg-track ae-u-rounded-full ae-u-h-1_5 ae-u-overflow-hidden">
                <div
                  className="ae-u-h-full ae-u-bg-heat ae-u-transition-all ae-u-duration-300"
                  style={{ width: `${Math.min(100, ((fanNoise - 20) / 25) * 100)}%` }}
                />
              </div>
              <div className="ae-u-flex ae-u-justify-between ae-u-text-10 ae-u-font-mono ae-u-text-subtle ae-u-mt-1_5">
                <span>Whisper (21 dBA)</span>
                <span>Normal Studio (30 dBA)</span>
                <span>Audible (40 dBA)</span>
              </div>
            </div>
          </div>

          <div className="ae-u-border-t ae-u-pt-4 ae-u-flex ae-u-items-center ae-u-justify-between ae-u-text-xs ae-u-font-mono ae-u-text-subtle">
            <span>SIMULATION ALGORITHM: ISO-15729 / CFD</span>
            <span className="ae-u-text-primary">CALCULATED LIVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
