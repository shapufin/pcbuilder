'use client'

import { DEFAULT_BUILDER_DESIGN, type BuilderDesign } from '@buildmyrig/plugin-pc-builder'
import { BUILDER_DESIGN_COMPONENTS } from '../designs'
import { BuilderProvider } from '../builder-provider'
import type { ConfigureTemplate } from './page'

/**
 * Punto di ingresso client di /builder/configure (entry 50 P2): risolve il
 * design dal global e monta il provider condiviso. Slug ignoto → rig-studio.
 */
export function BuilderShell({
  design,
  template,
  templates,
}: {
  design: BuilderDesign
  template: ConfigureTemplate | null
  templates: ConfigureTemplate[]
}) {
  const Design =
    BUILDER_DESIGN_COMPONENTS[design] ?? BUILDER_DESIGN_COMPONENTS[DEFAULT_BUILDER_DESIGN]
  return (
    <BuilderProvider template={template} templates={templates}>
      <Design />
    </BuilderProvider>
  )
}
