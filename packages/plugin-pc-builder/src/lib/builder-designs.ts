/**
 * Builder designs — the admin-selectable storefront renderer for
 * /builder/configure (entry 50). Registry mirrors THEME_PRESETS in
 * plugin-pages: slugs are the contract, apps/web maps slug → component in
 * src/app/(frontend)/builder/designs.ts. Business logic (builder index, rule engine,
 * endpoints) is shared across all designs — only presentation swaps.
 * Adding a design = entry here + a designs/<slug>/ dir + registry entry.
 */
export type BuilderDesignPalette = 'inherit' | 'accent'

export type BuilderDesignDef = {
  label: string
  /** One-liner shown in the admin picker / docs. */
  description: string
  /**
   * How the design consumes the site theme (entry 131). 'inherit' = every
   * color is a --color-* token, so an admin theme edit repaints the design
   * wholesale. 'accent' = same surfaces/text, plus the design's own --bd-*
   * elevation/line ramp (packages/lib builder-palette) derived from the live
   * theme vars — that is how a mockup keeps its contrast ladder without
   * freezing the theme out.
   */
  palette: BuilderDesignPalette
}

export const BUILDER_DESIGNS = {
  classic: {
    label: 'Classic wizard',
    description: 'Step-by-step wizard: one category per step, sticky build rail and price summary.',
    palette: 'inherit',
  },
  'rig-studio': {
    label: 'RIG Studio',
    description: 'CAD console: component bay, blueprint canvas, telemetry cards and matrix view.',
    palette: 'accent',
  },
  atelier: {
    label: 'Atelier',
    description: 'Editorial studio: vector rig stage, numbered spec sheet and an architectural blueprint screen.',
    palette: 'accent',
  },
} satisfies Record<string, BuilderDesignDef>

export type BuilderDesign = keyof typeof BUILDER_DESIGNS

/** P4 activation (entry 54): 'rig-studio' is the default; 'classic' stays selectable. */
export const DEFAULT_BUILDER_DESIGN: BuilderDesign = 'rig-studio'

export const builderDesignOptions = (): Array<{ label: string; value: BuilderDesign }> =>
  (Object.entries(BUILDER_DESIGNS) as Array<[BuilderDesign, BuilderDesignDef]>).map(
    ([value, def]) => ({ label: def.label, value }),
  )

/**
 * Never-throw resolver for the builder-settings global — server components
 * call this while rendering, so a missing doc or hostile slug must fall back
 * to the default, not throw (own-prop check; see entry-49 #293).
 */
export const resolveBuilderDesign = (doc: unknown): BuilderDesign => {
  const d = (doc ?? {}) as Record<string, unknown>
  return typeof d.design === 'string' &&
    Object.prototype.hasOwnProperty.call(BUILDER_DESIGNS, d.design)
    ? (d.design as BuilderDesign)
    : DEFAULT_BUILDER_DESIGN
}
