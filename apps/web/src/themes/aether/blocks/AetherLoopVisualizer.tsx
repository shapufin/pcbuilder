import React from 'react'
import { AetherLoopVisualizerClient } from '../client/AetherLoopVisualizerClient'

export interface AetherLoopVisualizerProps {
  block: {
    heading: string
    eyebrow?: string
    subtitle?: string
    defaultCoolant?: string
    defaultTubing?: string
    showFlowRateControl?: boolean
  }
}

export function AetherLoopVisualizer({ block }: AetherLoopVisualizerProps) {
  const {
    heading,
    eyebrow = 'CUSTOM WATERBLOCK & MANIFOLD ARCHITECTURE',
    subtitle = 'Inspect CNC-milled acrylic manifolds, brass fittings, and sub-ambient fluid profiles.',
    defaultCoolant = 'cyan',
    defaultTubing = 'brass',
    showFlowRateControl = true,
  } = block

  return (
    <section className="ae-u-py-12 ae-u-px-4 ae-u-max-w-7xl ae-u-mx-auto" aria-label="Aether Custom Loop Fluid Dynamics">
      <AetherLoopVisualizerClient
        heading={heading}
        eyebrow={eyebrow}
        subtitle={subtitle}
        defaultCoolant={defaultCoolant}
        defaultTubing={defaultTubing}
        showFlowRateControl={showFlowRateControl}
      />
    </section>
  )
}
