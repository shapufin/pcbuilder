'use client'

import React, { useState } from 'react'
import {
  Thermometer,
  Cpu,
  Zap,
  Activity,
} from 'lucide-react'

export function AetherProductLabClient({
  heading,
  eyebrow,
  subtitle,
}: {
  heading: string
  eyebrow?: string
  subtitle?: string
}) {
  const [viewMode, setViewMode] = useState<'standard' | 'xray'>('standard')
  const [activeTab, setActiveTab] = useState<'thermal' | 'silicon' | 'power'>('thermal')

  return (
    <div className="ae-lab">
      <div className="ae-lab__header">
        {eyebrow ? <p className="ae-lab__eyebrow">{eyebrow}</p> : null}
        <h2 className="ae-lab__heading">{heading}</h2>
        {subtitle ? <p className="ae-lab__subtitle">{subtitle}</p> : null}
      </div>

      <div className="ae-lab__card">
        {/* Interactive Visual Canvas / Diagram */}
        <div className="ae-lab__visual">
          <div className="ae-u-absolute ae-u-top-4 ae-u-left-4 ae-u-flex ae-u-flex-wrap ae-u-gap-2">
            <button
              type="button"
              onClick={() => setViewMode('standard')}
              className="ae-u-rounded ae-u-px-3 ae-u-py-1 ae-u-font-mono ae-u-text-xs ae-u-font-semibold ae-u-transition"
              style={{
                backgroundColor: viewMode === 'standard' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: viewMode === 'standard' ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
              }}
            >
              Exterior Loop View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('xray')}
              className="ae-u-rounded ae-u-px-3 ae-u-py-1 ae-u-font-mono ae-u-text-xs ae-u-font-semibold ae-u-transition"
              style={{
                backgroundColor: viewMode === 'xray' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: viewMode === 'xray' ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
              }}
            >
              X-Ray Die Inspection
            </button>
          </div>

          <div className="ae-u-my-12 ae-u-text-center">
            <div
              className="ae-u-mx-auto ae-u-mb-4 ae-u-flex ae-u-h-32 ae-u-w-48 ae-u-items-center ae-u-justify-center ae-u-rounded-xl ae-u-border ae-u-font-mono ae-u-text-xs ae-u-font-bold ae-u-transition-all"
              style={{
                borderColor: viewMode === 'xray' ? 'var(--color-accent)' : 'var(--color-primary)',
                backgroundColor: 'var(--color-surface)',
                boxShadow:
                  viewMode === 'xray'
                    ? '0 0 30px var(--color-info-soft)'
                    : '0 0 30px var(--color-primary-soft)',
              }}
            >
              {viewMode === 'xray' ? (
                <div className="ae-u-space-y-2 ae-u-text-accent">
                  <Activity size={32} className="ae-u-mx-auto" />
                  <div>COPPER MICROFINS</div>
                  <div className="ae-u-text-10 ae-u-text-muted">0.2mm FIN PITCH // DIRECT DIE</div>
                </div>
              ) : (
                <div className="ae-u-space-y-2 ae-lab-x-1">
                  <Cpu size={32} className="ae-u-mx-auto" />
                  <div>MONOLITHIC WATERBLOCK</div>
                  <div className="ae-u-text-10 ae-u-text-muted">NICKEL-PLATED BRASS</div>
                </div>
              )}
            </div>
            <p className="ae-u-font-mono ae-u-text-xs ae-u-text-muted">
              {viewMode === 'xray'
                ? 'Internal liquid channels verified under 1.5 bar hydrostatic pressure.'
                : 'Custom full-coverage liquid coldplate for RTX 5090 Series.'}
            </p>
          </div>
        </div>

        {/* Telemetry Bench Metrics */}
        <div>
          <div className="ae-u-mb-6 ae-u-flex ae-u-flex-wrap ae-u-gap-2 ae-u-border-b ae-u-pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('thermal')}
              className="ae-u-flex ae-u-items-center ae-u-gap-1_5 ae-u-px-3 ae-u-py-1_5 ae-u-font-mono ae-u-text-xs ae-u-font-semibold ae-u-rounded"
              style={{
                backgroundColor: activeTab === 'thermal' ? 'var(--color-surface-hover)' : 'transparent',
                color: activeTab === 'thermal' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              <Thermometer size={14} />
              <span>Thermal Run-In</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('silicon')}
              className="ae-u-flex ae-u-items-center ae-u-gap-1_5 ae-u-px-3 ae-u-py-1_5 ae-u-font-mono ae-u-text-xs ae-u-font-semibold ae-u-rounded"
              style={{
                backgroundColor: activeTab === 'silicon' ? 'var(--color-surface-hover)' : 'transparent',
                color: activeTab === 'silicon' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              <Cpu size={14} />
              <span>Silicon Binning</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('power')}
              className="ae-u-flex ae-u-items-center ae-u-gap-1_5 ae-u-px-3 ae-u-py-1_5 ae-u-font-mono ae-u-text-xs ae-u-font-semibold ae-u-rounded"
              style={{
                backgroundColor: activeTab === 'power' ? 'var(--color-surface-hover)' : 'transparent',
                color: activeTab === 'power' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              <Zap size={14} />
              <span>Power Telemetry</span>
            </button>
          </div>

          <div className="ae-lab__grid-telemetry">
            {activeTab === 'thermal' ? (
              <>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">GPU Core Temp</div>
                  <div className="ae-stat-pill__val">44.2°C</div>
                  <div className="ae-stat-pill__note">Ambient 21.0°C (FurMark 4K)</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">Hotspot Delta</div>
                  <div className="ae-stat-pill__val">Δ 10.8°C</div>
                  <div className="ae-stat-pill__note">Uniform mounting torque</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">Liquid Coolant Flow</div>
                  <div className="ae-stat-pill__val">2.8 L/min</div>
                  <div className="ae-stat-pill__note">D5 PWM Dual Pump Loop</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">Acoustic Noise Floor</div>
                  <div className="ae-stat-pill__val">23.4 dBA</div>
                  <div className="ae-stat-pill__note">Whisper silent at 100% load</div>
                </div>
              </>
            ) : activeTab === 'silicon' ? (
              <>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">Silicon SP Score</div>
                  <div className="ae-stat-pill__val">SP 116</div>
                  <div className="ae-stat-pill__note">Top 0.8% worldwide sample</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">Vcore Undervolt</div>
                  <div className="ae-stat-pill__val">-85 mV</div>
                  <div className="ae-stat-pill__note">Stable under Prime95 Small FFT</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">FCLK Stability</div>
                  <div className="ae-stat-pill__val">2200 MHz</div>
                  <div className="ae-stat-pill__note">1:1 UCLK matched mode</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">Binning Grade</div>
                  <div className="ae-stat-pill__val ae-lab-x-1">
                    GOLDEN
                  </div>
                  <div className="ae-stat-pill__note">Telemetry stamped &amp; logged</div>
                </div>
              </>
            ) : (
              <>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">Sustained Power Draw</div>
                  <div className="ae-stat-pill__val">520 Watts</div>
                  <div className="ae-stat-pill__note">Without thermal throttling</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">VRM Temperature</div>
                  <div className="ae-stat-pill__val">48.0°C</div>
                  <div className="ae-stat-pill__note">Liquid-cooled MOSFET block</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">Efficiency Rating</div>
                  <div className="ae-stat-pill__val">94.2%</div>
                  <div className="ae-stat-pill__note">Titanium ATX 3.1 PSU spec</div>
                </div>
                <div className="ae-stat-pill">
                  <div className="ae-stat-pill__title">12VHPWR Header Temp</div>
                  <div className="ae-stat-pill__val">38.6°C</div>
                  <div className="ae-stat-pill__note">Reinforced copper terminals</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
