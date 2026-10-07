import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Critical-path weight guards (entry 64, home-LCP watch item). The
 * framer-motion chunk (~57 KB) was in the initial HTML of every page because
 * the site-wide header badge and cart drawer imported motion. Both are now
 * off the critical path — these assertions pin that, since a bundle
 * regression is invisible to unit tests otherwise.
 */
const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8')

describe('critical path', () => {
  it('#426 the site-wide header badge animates in CSS, not framer-motion', () => {
    const badge = src('CartBadge.tsx')
    expect(badge).not.toContain("from 'framer-motion'")
    expect(badge).not.toMatch(/\bmotion\./)
    expect(badge).toContain('nav-badge--pop')
    const css = src('shell.css')
    expect(css).toContain('@keyframes nav-badge-pop')
    expect(css).toContain('.nav-badge--pop')
    expect(css).toMatch(/prefers-reduced-motion[^}]*\{[^}]*nav-badge--pop/)
  })

  it('#427 the layout defers the cart drawer behind an ssr:false import', () => {
    expect(src('../app/(frontend)/layout.tsx')).not.toContain("from '../components/CartDrawer'")
    const lazy = src('CartDrawerLazy.tsx')
    expect(lazy).toContain('ssr: false')
    expect(lazy).toContain("import('./CartDrawer')")
  })

  it('#428 the add-to-cart chip flight loads its motion chunk on demand', () => {
    const button = src('../app/(frontend)/product/[slug]/AddToCartButton.tsx')
    expect(button).not.toContain("from '@/lib/fly-to-cart'")
    expect(button).toContain("import('@/lib/fly-to-cart')")
    const builder = src('../app/(frontend)/builder/kit/useBuildActions.ts')
    expect(builder).not.toContain("from '@/lib/fly-to-cart'")
    expect(builder).toContain("import('@/lib/fly-to-cart')")
  })
})
