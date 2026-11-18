import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type Dept = {
  title: string
  code: string
  description?: string
  telemetry?: string
  categorySlug: string
}

export interface AetherTelemetryGridProps {
  block: {
    heading: string
    eyebrow?: string
    subtitle?: string
    departments?: Dept[]
  }
}

export function AetherTelemetryGrid({ block }: AetherTelemetryGridProps) {
  const {
    heading,
    eyebrow = 'HARDWARE DEPARTMENTS',
    subtitle = 'Filter high-compute parts by thermal dissipation, silicon binning score, and form factor.',
    departments = [
      {
        title: 'Graphics Processing (GPU)',
        code: 'DEP-GPU-01',
        description: 'RTX 5090 & 4090 with pre-fitted liquid blocks and delta-T verification.',
        telemetry: '450W TDP VALIDATED',
        categorySlug: 'gpu',
      },
      {
        title: 'Binned Processors (CPU)',
        code: 'DEP-CPU-02',
        description: 'SP-ranked silicon tested for stable undervolting and low vDroop.',
        telemetry: 'TOP 1% SAMPLES',
        categorySlug: 'cpu',
      },
      {
        title: 'Motherboards & VRMs',
        code: 'DEP-MB-03',
        description: 'Multi-layer server PCB motherboards with monoblock cooling support.',
        telemetry: '24+2+1 POWER STAGES',
        categorySlug: 'motherboard',
      },
      {
        title: 'Liquid Cooling Loops',
        code: 'DEP-COOL-04',
        description: 'Monolithic distribution plates, brass fittings, and dual D5 pumps.',
        telemetry: '1.5 BAR HYDROSTATIC',
        categorySlug: 'cooling',
      },
    ],
  } = block

  return (
    <section className="ae-u-py-16 ae-u-px-4 ae-u-max-w-7xl ae-u-mx-auto" aria-label="Engineered Hardware Departments">
      <div className="ae-u-text-center ae-u-mb-12">
        {eyebrow ? <p className="ae-lab__eyebrow">{eyebrow}</p> : null}
        <h2 className="ae-lab__heading">{heading}</h2>
        {subtitle ? <p className="ae-lab__subtitle">{subtitle}</p> : null}
      </div>

      <div className="ae-u-grid ae-u-grid-cols-1 ae-u-md-grid-cols-2 ae-u-lg-grid-cols-4 ae-u-gap-6">
        {departments.map((dept, i) => (
          <Link
            key={i}
            href={`/shop/${dept.categorySlug}`}
            className="ae-u-rounded-xl ae-u-border ae-u-p-6 ae-u-transition-all ae-u-hover--translate-y-1 ae-u-block ae-telemetry-x-1"
          >
            <div className="ae-u-flex ae-u-items-center ae-u-justify-between ae-u-mb-4">
              <span className="ae-u-font-mono ae-u-text-xs ae-u-text-primary ae-u-font-bold ae-u-tracking-wider">{dept.code}</span>
              <span className="ae-u-h-2 ae-u-w-2 ae-u-rounded-full ae-u-bg-success ae-u-shadow-sm" />
            </div>

            <h3 className="ae-u-text-base ae-u-font-bold ae-u-text-strong ae-u-mb-2">{dept.title}</h3>
            {dept.description ? <p className="ae-u-text-xs ae-u-text-muted ae-u-mb-4 ae-u-leading-relaxed">{dept.description}</p> : null}

            <div className="ae-u-border-t ae-u-pt-3 ae-u-flex ae-u-items-center ae-u-justify-between ae-u-text-xs ae-u-font-mono">
              <span className="ae-u-text-10 ae-u-text-subtle">{dept.telemetry}</span>
              <span className="ae-u-text-primary ae-u-flex ae-u-items-center ae-u-gap-1">
                <span>Filter</span>
                <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
