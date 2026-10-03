/**
 * Builder designs — the admin-selectable storefront renderer for
 * /builder/configure (entry 50). Registry mirrors THEME_PRESETS in
 * plugin-pages: slugs are the contract, apps/web maps slug → component in
 * src/app/builder/designs.ts. Business logic (builder index, rule engine,
 * endpoints) is shared across all designs — only presentation swaps.
 * Adding a design = entry here + a designs/<slug>/ dir + registry entry.
 */
export const BUILDER_DESIGNS = {
  classic: { label: 'Classic wizard' },
  'rig-studio': { label: 'RIG Studio' },
} satisfies Record<string, { label: string }>

export type BuilderDesign = keyof typeof BUILDER_DESIGNS

/** P4 activation (entry 54): 'rig-studio' is the default; 'classic' stays selectable. */
export const DEFAULT_BUILDER_DESIGN: BuilderDesign = 'rig-studio'

export const builderDesignOptions = (): Array<{ label: string; value: BuilderDesign }> =>
  (Object.entries(BUILDER_DESIGNS) as Array<[BuilderDesign, { label: string }]>).map(
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
