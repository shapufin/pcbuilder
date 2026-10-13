import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EntityListCell } from './EntityListCell.tsx'
import { CodeChipCell } from './CodeChipCell.tsx'
import { PriceListCell } from './PriceListCell.tsx'

vi.mock('@payloadcms/ui', () => ({
  Link: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    prefetch?: boolean
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useConfig: () => ({ config: { routes: { admin: '/admin' } } }),
}))

describe('EntityListCell (#582 - #585)', () => {
  it('#582 renders monogram initials, bold title and sku subtitle', () => {
    const html = renderToStaticMarkup(
      <EntityListCell
        cellData="Core i9-14900K"
        rowData={{ id: 7, sku: 'BX80715', name: 'Core i9-14900K' }}
        collectionSlug="components"
        field={{ name: 'name', type: 'text' } as never}
      />,
    )
    expect(html).toContain('bmr-table-entity-cell__initials')
    expect(html).toContain('>CI<')
    expect(html).toContain('bmr-table-entity-cell__title')
    expect(html).toContain('Core i9-14900K')
    expect(html).toContain('BX80715')
  })

  it('#583 falls back to slug then #id for the subtitle', () => {
    const slugHtml = renderToStaticMarkup(
      <EntityListCell
        cellData="Gaming Mice"
        rowData={{ id: 3, slug: 'gaming-mice' }}
        collectionSlug="categories"
        field={{ name: 'title', type: 'text' } as never}
      />,
    )
    expect(slugHtml).toContain('gaming-mice')

    const idHtml = renderToStaticMarkup(
      <EntityListCell
        cellData="Unbranded"
        rowData={{ id: 42 }}
        collectionSlug="brands"
        field={{ name: 'name', type: 'text' } as never}
      />,
    )
    expect(idHtml).toContain('#42')
  })

  it('#584 does not echo the title as its own subtitle (users email column)', () => {
    const html = renderToStaticMarkup(
      <EntityListCell
        cellData="staff@buildmyrig.test"
        rowData={{ id: 3, email: 'staff@buildmyrig.test' }}
        collectionSlug="users"
        field={{ name: 'email', type: 'email' } as never}
      />,
    )
    expect(html).toContain('staff@buildmyrig.test')
    expect(html).toContain('#3')
  })

  it('#585 builds the edit link from collectionSlug/rowData.id when link is true but linkURL is absent (Payload only sets linkURL with formatDocURL)', () => {
    const html = renderToStaticMarkup(
      <EntityListCell
        cellData="Core i9-14900K"
        rowData={{ id: 7 }}
        collectionSlug="components"
        link
        field={{ name: 'name', type: 'text' } as never}
      />,
    )
    expect(html).toContain('href="/admin/collections/components/7"')
  })

  it('#593 renders the row thumbnail when a gallery/images media object is present', () => {
    const html = renderToStaticMarkup(
      <EntityListCell
        cellData="ASUS OLED"
        rowData={{
          id: 34,
          title: 'ASUS OLED',
          gallery: [
            { id: 2, thumbnailURL: '/api/media/file/thumb.png', url: '/api/media/file/full.png' },
          ],
        }}
        collectionSlug="products"
        field={{ name: 'title', type: 'text' } as never}
      />,
    )
    expect(html).toContain('bmr-table-entity-cell__avatar')
    expect(html).toContain('/api/media/file/thumb.png')
    expect(html).not.toContain('bmr-table-entity-cell__initials')
  })

  it('#594 falls back to monogram initials when media is unresolved ids or absent', () => {
    const html = renderToStaticMarkup(
      <EntityListCell
        cellData="Corsair RM850x"
        rowData={{ id: 24, gallery: [12, 13] }}
        collectionSlug="products"
        field={{ name: 'title', type: 'text' } as never}
      />,
    )
    expect(html).toContain('bmr-table-entity-cell__initials')
    expect(html).toContain('>CR<')
  })

  it('#592 renders a select-row button instead of a link when onClick is provided', () => {
    const onClick = vi.fn()
    const html = renderToStaticMarkup(
      <EntityListCell
        cellData="Core i9-14900K"
        rowData={{ id: 7 }}
        collectionSlug="components"
        link
        onClick={onClick}
        field={{ name: 'name', type: 'text' } as never}
      />,
    )
    expect(html).toContain('<button')
    expect(html).not.toContain('<a ')
  })
})

describe('CodeChipCell (#586 - #587)', () => {
  it('#586 renders the value inside the monospace code chip', () => {
    const html = renderToStaticMarkup(
      <CodeChipCell
        cellData="LGA1700"
        rowData={{ id: 1 }}
        collectionSlug="components"
        field={{ name: 'socket', type: 'select' } as never}
      />,
    )
    expect(html).toContain('bmr-table-code-chip')
    expect(html).toContain('<code>LGA1700</code>')
  })

  it('#587 renders an em dash placeholder for empty values', () => {
    const html = renderToStaticMarkup(
      <CodeChipCell
        cellData={null as never}
        rowData={{ id: 1 }}
        collectionSlug="products"
        field={{ name: 'sku', type: 'text' } as never}
      />,
    )
    expect(html).toContain('—')
  })
})

describe('PriceListCell (#588 - #589)', () => {
  it('#588 formats EUR cents as tabular currency', () => {
    const html = renderToStaticMarkup(
      <PriceListCell
        cellData={58900}
        rowData={{ id: 1 }}
        collectionSlug="products"
        field={{ name: 'priceInEUR', type: 'number' } as never}
      />,
    )
    expect(html).toContain('bmr-price-cell')
    expect(html).toContain('589')
    expect(html).toContain('€')
  })

  it('#589 renders an em dash for null/malformed values', () => {
    const html = renderToStaticMarkup(
      <PriceListCell
        cellData={null as never}
        rowData={{ id: 1 }}
        collectionSlug="orders"
        field={{ name: 'total', type: 'number' } as never}
      />,
    )
    expect(html).toContain('—')
  })
})
