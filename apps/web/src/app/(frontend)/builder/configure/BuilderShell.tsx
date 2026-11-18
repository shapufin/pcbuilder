'use client'

import {
  BUILDER_DESIGNS,
  DEFAULT_BUILDER_DESIGN,
  type BuilderDesign,
  type PlatformId,
} from '@buildmyrig/plugin-pc-builder'
import { BUILDER_DESIGN_COMPONENTS } from '../designs'
import { BuilderProvider } from '../builder-provider'
import type { ConfigureTemplate } from './page'

/**
 * Punto di ingresso client di /builder/configure (entry 50 P2): risolve il
 * design dal global e monta il provider condiviso. Slug ignoto → rig-studio.
 * Entry 131: the registry's palette policy is passed to the design, so the
 * theme-inheritance contract lives in one place (BUILDER_DESIGNS).
 */
export function BuilderShell({
  design,
  template,
  templates,
  path,
}: {
  design: BuilderDesign
  template: ConfigureTemplate | null
  templates: ConfigureTemplate[]
  path?: PlatformId | null
}) {
  const resolved = BUILDER_DESIGN_COMPONENTS[design] ? design : DEFAULT_BUILDER_DESIGN
  const Design = BUILDER_DESIGN_COMPONENTS[resolved]
  return (
    <BuilderProvider template={template} templates={templates} initialPath={path ?? null}>
      <Design palette={BUILDER_DESIGNS[resolved].palette} />
    </BuilderProvider>
  )
}
