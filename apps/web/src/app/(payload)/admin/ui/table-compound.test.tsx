import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import {
  TableEntityCell,
  TableCodeChip,
  TableStatusBadge,
  TableActionStrip,
} from './TableCompound'

describe('Admin UI High-Density TableCompound Primitives (Phase 3)', () => {
  it('#503 TableEntityCell renders initials monogram, title, and subtitle', () => {
    const html = renderToString(
      <TableEntityCell
        initials="Intel Core i9"
        title="Intel Core i9-14900K"
        subtitle="BX8071514900K"
      />,
    )
    expect(html).toContain('bmr-table-entity-cell')
    expect(html).toContain('bmr-table-entity-cell__initials')
    expect(html).toContain('IN')
    expect(html).toContain('Intel Core i9-14900K')
    expect(html).toContain('BX8071514900K')
  })

  it('#504 TableEntityCell renders custom ReactNode avatar when provided', () => {
    const html = renderToString(
      <TableEntityCell
        avatar={<span data-testid="custom-avatar">CPU</span>}
        title="AMD Ryzen 7 7800X3D"
      />,
    )
    expect(html).toContain('bmr-table-entity-cell__avatar')
    expect(html).toContain('data-testid="custom-avatar"')
    expect(html).toContain('AMD Ryzen 7 7800X3D')
    expect(html).not.toContain('bmr-table-entity-cell__initials')
  })

  it('#505 TableCodeChip renders code inside semantic code tag with bmr-table-code-chip', () => {
    const html = renderToString(<TableCodeChip code="AM5-SOCKET-01" />)
    expect(html).toContain('bmr-table-code-chip')
    expect(html).toContain('<code>AM5-SOCKET-01</code>')
  })

  it('#506 TableStatusBadge renders indicator dot, capitalised status label, and variant class', () => {
    const htmlActive = renderToString(<TableStatusBadge status="active" />)
    expect(htmlActive).toContain('bmr-table-status--active')
    expect(htmlActive).toContain('bmr-table-status__dot')
    expect(htmlActive).toContain('Active')

    const htmlDraft = renderToString(<TableStatusBadge status="draft" />)
    expect(htmlDraft).toContain('bmr-table-status--draft')
    expect(htmlDraft).toContain('Draft')

    const htmlError = renderToString(<TableStatusBadge status="error" />)
    expect(htmlError).toContain('bmr-table-status--error')
    expect(htmlError).toContain('Error')
  })

  it('#507 TableStatusBadge respects custom label override', () => {
    const html = renderToString(<TableStatusBadge status="warning" label="Pending Review" />)
    expect(html).toContain('bmr-table-status--warning')
    expect(html).toContain('Pending Review')
  })

  it('#508 TableActionStrip renders children in inline action container', () => {
    const html = renderToString(
      <TableActionStrip>
        <button type="button">Edit</button>
        <button type="button">Delete</button>
      </TableActionStrip>,
    )
    expect(html).toContain('bmr-table-action-strip')
    expect(html).toContain('Edit')
    expect(html).toContain('Delete')
  })
})
