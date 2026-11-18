import React from 'react'
import { AetherProductLabClient } from '../client/AetherProductLabClient'

export interface AetherProductLabProps {
  block: {
    heading: string
    eyebrow?: string
    subtitle?: string
    categorySlug?: string
    showBenchmarkTelemetry?: boolean
  }
}

export function AetherProductLab({ block }: AetherProductLabProps) {
  return (
    <section aria-label="Hardware Telemetry Laboratory">
      <AetherProductLabClient
        heading={block.heading}
        eyebrow={block.eyebrow}
        subtitle={block.subtitle}
      />
    </section>
  )
}
