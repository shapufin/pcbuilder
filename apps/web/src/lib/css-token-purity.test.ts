import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Step C (entry 21) - CSS purity: raw hex values may only live in
 * @buildmyrig/ui/tokens.css (the one definition site). App stylesheets
 * (globals.css, builder.css) reference tokens; builder.css must not carry
 * its own :root value block anymore (entry 17's local block predates the
 * theme system and drifted from tokens.css).
 */
const APP_CSS = [
  path.resolve(__dirname, '../app/(frontend)/globals.css'),
  path.resolve(__dirname, '../app/(frontend)/builder/builder.css'),
  // Phase-0 redesign stylesheets — same contract.
  path.resolve(__dirname, '../components/shell.css'),
  path.resolve(__dirname, '../components/ui/primitives.css'),
  // Phase-1 storefront stylesheets — same contract.
  path.resolve(__dirname, '../components/product-card.css'),
  path.resolve(__dirname, '../app/(frontend)/shop/shop.css'),
  path.resolve(__dirname, '../app/(frontend)/product/[slug]/product.css'),
  path.resolve(__dirname, '../app/(frontend)/cart/cart.css'),
  path.resolve(__dirname, '../app/(frontend)/checkout/checkout.css'),
  // Phase-2/3 stylesheets — same contract.
  path.resolve(__dirname, '../app/(frontend)/auth/auth.css'),
  path.resolve(__dirname, '../blocks/blocks.css'),
  // Builder design stylesheets — same contract.
  path.resolve(__dirname, '../app/(frontend)/builder/designs/rig-studio/rig-studio.css'),
]

describe('app CSS token purity', () => {
  it('#142 app stylesheets contain no raw hex values', () => {
    for (const file of APP_CSS) {
      const css = fs.readFileSync(file, 'utf8')
      const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
      expect(hexes, `${path.basename(file)} still defines raw hex: ${hexes.join(', ')}`).toHaveLength(0)
    }
  })

  it('#142b builder.css no longer redefines the token set (:root values live in tokens.css only)', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../app/(frontend)/builder/builder.css'), 'utf8')
    expect(css).not.toContain('--space-1:')
    expect(css).not.toContain('--color-bg:')
    expect(css).toContain('var(--color-bg)')
  })
})
