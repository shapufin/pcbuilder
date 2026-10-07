import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StepPanel } from './StepPanel'

const category = {
  id: 'cpu',
  slug: 'cpu',
  name: 'CPU',
  required: true,
  maxSelectable: 1,
  sortOrder: 0,
}

const noop = () => {}

describe('StepPanel', () => {
  it('#400 renders the mobile filter-drawer trigger alongside the inline filter bar', () => {
    const html = renderToStaticMarkup(
      <StepPanel
        category={category}
        options={[]}
        totalOptions={0}
        selectedIds={[]}
        selectedEntries={[]}
        excluded={new Map()}
        warnedIds={new Set()}
        query=""
        brand={null}
        brands={[]}
        onQuery={noop}
        onBrand={noop}
        onToggle={noop}
        onRemove={noop}
        onClearSlot={noop}
        onPrev={noop}
        onNext={noop}
        isFirst
        isLast={false}
      />,
    )
    expect(html).toContain('filter-drawer__open')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('panel-filters')
    expect(html).toContain('filter-bar')
  })
})
