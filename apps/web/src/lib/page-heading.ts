/**
 * Heading rules for CMS-composed pages.
 *
 * Blocks that render the page's own `<h1>` (the hero family). Everything else
 * leaves the document without a level-one heading, which fails WCAG 1.3.1 and
 * weakens SEO — audit 2026-10-22, #675. Kept in its own module (no payload
 * import) so it stays unit-testable.
 */
export const H1_BLOCKS = ['hero', 'aetherHero', 'nexusHero'] as const

export const layoutHasH1 = (layout?: { blockType?: string }[] | null): boolean =>
  (layout ?? []).some((block) => H1_BLOCKS.includes((block?.blockType ?? '') as never))
