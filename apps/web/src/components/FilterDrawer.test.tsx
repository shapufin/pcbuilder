import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { FilterDrawer, FilterDrawerPanel } from './FilterDrawer'

/**
 * Round D mobile FilterDrawer for the builder's OptionsFilterBar. The
 * store-gated pattern follows CartDrawer: the closed component's SSR markup
 * is only the trigger, so the open-state a11y contract is tested through the
 * presentational FilterDrawerPanel (same split as CartDrawerOverlay).
 */
describe('FilterDrawer trigger', () => {
  it('#396 closed renders a dialog-trigger button with the a11y contract', () => {
    const html = renderToStaticMarkup(
      <FilterDrawer>
        <div />
      </FilterDrawer>,
    )
    expect(html).toContain('filter-drawer__open')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-expanded="false"')
    // useId suffix — the trigger must point at the panel it owns.
    expect(html).toMatch(/aria-controls="filter-drawer-panel[^"]*"/)
    expect(html).toContain('Filters')
  })

  it('#415 two mounted drawers get distinct panel ids (no duplicate aria-controls)', () => {
    const html = renderToStaticMarkup(
      <div>
        <FilterDrawer>
          <div />
        </FilterDrawer>
        <FilterDrawer>
          <div />
        </FilterDrawer>
      </div>,
    )
    const ids = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) expect(id).toMatch(/^filter-drawer-panel/)
  })

  it('#397 activeCount renders a count badge on the trigger; absent when zero', () => {
    const html = renderToStaticMarkup(
      <FilterDrawer activeCount={2}>
        <div />
      </FilterDrawer>,
    )
    expect(html).toContain('filter-drawer__count')
    expect(html).toContain('>2<')
    const none = renderToStaticMarkup(
      <FilterDrawer>
        <div />
      </FilterDrawer>,
    )
    expect(none).not.toContain('filter-drawer__count')
  })
})

describe('FilterDrawerPanel', () => {
  it('#398 renders an accessible labelled dialog containing the filters', () => {
    const html = renderToStaticMarkup(
      <FilterDrawerPanel onClose={() => {}}>
        <p>filter body</p>
      </FilterDrawerPanel>,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-label="Product filters"')
    expect(html).toContain('id="filter-drawer-panel"')
    expect(html).toContain('filter-drawer__backdrop')
    expect(html).toContain('filter body')
    expect(html).toContain('Close filters')
  })

  it('#398b label prop overrides the dialog aria-label', () => {
    const html = renderToStaticMarkup(
      <FilterDrawerPanel label="Part filters" onClose={() => {}}>
        <div />
      </FilterDrawerPanel>,
    )
    expect(html).toContain('aria-label="Part filters"')
  })
})

const CSS_DIR = path.resolve(__dirname)

describe('FilterDrawer CSS single-sourcing', () => {
  it('#401 the drawer base block lives in primitives.css; shop.css keeps only its breakpoint opt-in', () => {
    const primitives = fs.readFileSync(path.join(CSS_DIR, 'ui/primitives.css'), 'utf8')
    const shop = fs.readFileSync(path.resolve(CSS_DIR, '../app/shop/shop.css'), 'utf8')
    expect(primitives).toContain('.filter-drawer__panel')
    expect(primitives).toContain('.filter-drawer__backdrop')
    // shop.css opts in at its own breakpoint; the panel/backdrop definitions
    // must not be duplicated there.
    expect(shop).not.toContain('.filter-drawer__panel')
    expect(shop).toContain('.filter-drawer__open')
  })

  it('#401b builder.css hides the inline filters and shows the drawer trigger on mobile', () => {
    const builder = fs.readFileSync(path.resolve(CSS_DIR, '../app/builder/builder.css'), 'utf8')
    const mobile = builder.slice(builder.indexOf('@media (max-width: 900px)'))
    expect(mobile).toContain('.panel-filters')
    expect(mobile).toContain('.filter-drawer__open')
  })
})
