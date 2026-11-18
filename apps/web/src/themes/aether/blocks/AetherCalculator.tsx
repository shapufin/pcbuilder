import React from 'react'
import { AetherCalculatorClient } from '../client/AetherCalculatorClient'

export interface AetherCalculatorProps {
  block: {
    heading: string
    eyebrow?: string
    subtitle?: string
    defaultCpuTdp?: number
    defaultGpuTdp?: number
    showDelidComparison?: boolean
  }
}

export function AetherCalculator({ block }: AetherCalculatorProps) {
  const {
    heading,
    eyebrow = 'THERMAL COMPUTATION ENGINE',
    subtitle = 'Simulate junction delta-T across coldplate metallurgy and radiator surface area.',
    defaultCpuTdp = 320,
    defaultGpuTdp = 600,
    showDelidComparison = true,
  } = block

  return (
    <section className="ae-u-py-12 ae-u-px-4 ae-u-max-w-7xl ae-u-mx-auto" aria-label="Aether Thermal Headroom Calculator">
      <AetherCalculatorClient
        heading={heading}
        eyebrow={eyebrow}
        subtitle={subtitle}
        defaultCpuTdp={defaultCpuTdp}
        defaultGpuTdp={defaultGpuTdp}
        showDelidComparison={showDelidComparison}
      />
    </section>
  )
}
