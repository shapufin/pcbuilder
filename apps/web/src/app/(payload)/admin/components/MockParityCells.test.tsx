import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaxonomyStackCell } from './TaxonomyStackCell.tsx'
import { PriceListCell } from './PriceListCell.tsx'
import { StockCell } from './StockCell.tsx'
import { StatusPillCell } from './StatusPillCell.tsx'
import { RowActionsCell } from './RowActionsCell.tsx'
import { IdCell } from './IdCell.tsx'
import { applyListCellElevation } from '@/lib/admin-list-cells.ts'
import type { CollectionConfig } from 'payload'

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
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const field = { name: 'x', type: 'text' } as never

describe('TaxonomyStackCell — CATEGORY & BRAND stacked cell (#606 - #607)', () => {
  it('#606 renders the category title on line 1 and brand name on line 2', () => {
    const html = renderToStaticMarkup(
      <TaxonomyStackCell
        cellData={{ id: 10, title: 'GPUs' }}
        rowData={{ id: 41, brand: { id: 4, name: 'ASUS ROG' } }}
        collectionSlug="products"
        field={field}
      />,
    )
    expect(html).toContain('bmr-stack-cell__primary')
    expect(html).toContain('GPUs')
    expect(html).toContain('bmr-stack-cell__secondary')
    expect(html).toContain('ASUS ROG')
  })

  it('#607 falls back to em dashes when relations are missing or unresolved ids', () => {
    const html = renderToStaticMarkup(
      <TaxonomyStackCell
        cellData={7 as never}
        rowData={{ id: 40, brand: null }}
        collectionSlug="products"
        field={field}
      />,
    )
    expect(html).toContain('—')
    expect(html).not.toContain('bmr-stack-cell__secondary')
  })
})

describe('PriceListCell margin subline (#608 - #609)', () => {
  it('#608 renders the gross margin subline when rowData.costInEUR is present', () => {
    const html = renderToStaticMarkup(
      <PriceListCell
        cellData={118900}
        rowData={{ id: 41, costInEUR: 89000 }}
        collectionSlug="products"
        field={{ name: 'priceInEUR', type: 'number' } as never}
      />,
    )
    expect(html).toContain('€1,189.00')
    expect(html).toContain('bmr-price-cell__margin')
    // (118900-89000)/118900 = 25.1%
    expect(html).toContain('25.1% margin')
  })

  it('#609 omits the margin subline when cost is absent and flags a negative margin', () => {
    const noCost = renderToStaticMarkup(
      <PriceListCell
        cellData={58900}
        rowData={{ id: 1 }}
        collectionSlug="orders"
        field={{ name: 'total', type: 'number' } as never}
      />,
    )
    expect(noCost).not.toContain('margin')

    const negative = renderToStaticMarkup(
      <PriceListCell
        cellData={10000}
        rowData={{ id: 9, costInEUR: 12000 }}
        collectionSlug="products"
        field={{ name: 'priceInEUR', type: 'number' } as never}
      />,
    )
    expect(negative).toContain('-20.0% margin')
    expect(negative).toContain('bmr-price-cell__margin--negative')
  })
})

describe('StockCell (#610)', () => {
  it('#610 renders "N in stock", honors untracked products, em dash when null', () => {
    const stocked = renderToStaticMarkup(
      <StockCell cellData={14} rowData={{ id: 1 }} collectionSlug="products" field={field} />,
    )
    expect(stocked).toContain('14')
    expect(stocked).toContain('in stock')

    const untracked = renderToStaticMarkup(
      <StockCell
        cellData={null as never}
        rowData={{ id: 1, trackQuantity: false }}
        collectionSlug="products"
        field={field}
      />,
    )
    expect(untracked).toContain('Untracked')

    const empty = renderToStaticMarkup(
      <StockCell cellData={null as never} rowData={{ id: 1 }} collectionSlug="products" field={field} />,
    )
    expect(empty).toContain('—')
  })
})

describe('StatusPillCell (#611)', () => {
  it('#611 renders functional status pills for draft and published', () => {
    const draft = renderToStaticMarkup(
      <StatusPillCell cellData="draft" rowData={{ id: 1 }} collectionSlug="products" field={field} />,
    )
    expect(draft).toContain('bmr-status-pill--draft')
    expect(draft).toContain('DRAFT')

    const published = renderToStaticMarkup(
      <StatusPillCell
        cellData="published"
        rowData={{ id: 1 }}
        collectionSlug="products"
        field={field}
      />,
    )
    expect(published).toContain('bmr-status-pill--published')
    expect(published).toContain('PUBLISHED')
  })
})

describe('RowActionsCell (#612 - #613)', () => {
  it('#612 renders an edit pencil link to the document edit view', () => {
    const html = renderToStaticMarkup(
      <RowActionsCell
        cellData={undefined as never}
        rowData={{ id: 41 }}
        collectionSlug="products"
        field={field}
      />,
    )
    expect(html).toContain('href="/admin/collections/products/41"')
    expect(html).toContain('bmr-row-actions')
    expect(html).toContain('aria-label="Edit"')
  })

  it('#613 renders a delete trigger that calls the REST DELETE endpoint', () => {
    const html = renderToStaticMarkup(
      <RowActionsCell
        cellData={undefined as never}
        rowData={{ id: 41 }}
        collectionSlug="products"
        field={field}
      />,
    )
    expect(html).toContain('aria-label="Delete"')
    expect(html).toContain('bmr-row-actions__delete')
  })
})

describe('IdCell (#614)', () => {
  it('#614 renders the document id as a mono #id token', () => {
    const html = renderToStaticMarkup(
      <IdCell cellData={41} rowData={{ id: 41 }} collectionSlug="products" field={field} />,
    )
    expect(html).toContain('#41')
    expect(html).toContain('bmr-id-cell')
  })
})

describe('applyListCellElevation — mock-parity transform (#615 - #617)', () => {
  const productsCollection = (): CollectionConfig =>
    ({
      slug: 'products',
      admin: { defaultColumns: ['title', 'category', 'brand', 'sku', 'priceInEUR', '_status', 'updatedAt'] },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'category', type: 'relationship' },
        { name: 'priceInEUR', type: 'number' },
        { name: 'inventory', type: 'number' },
      ],
    }) as never as CollectionConfig

  it('#615 injects _bmrActions/_bmrId/_bmrStatus ui fields with the parity cells', () => {
    const col = productsCollection()
    applyListCellElevation([col])
    const names = (col.fields as { name?: string; type?: string }[]).map((f) => f.name)
    for (const name of ['_bmrActions', '_bmrId', '_bmrStatus']) {
      expect(names).toContain(name)
    }
    const cellFor = (name: string) =>
      (
        (col.fields as { name?: string; admin?: { components?: { Cell?: string } } }[]).find(
          (f) => f.name === name,
        ) as { admin?: { components?: { Cell?: string } } }
      )?.admin?.components?.Cell
    expect(cellFor('_bmrActions')).toContain('RowActionsCell')
    expect(cellFor('_bmrId')).toContain('IdCell')
    expect(cellFor('_bmrStatus')).toContain('StatusPillCell')
  })

  it('#616 reorders products defaultColumns to the mock layout', () => {
    const col = productsCollection()
    applyListCellElevation([col])
    expect(col.admin?.defaultColumns).toEqual([
      '_bmrId',
      'title',
      'category',
      'priceInEUR',
      'inventory',
      '_bmrStatus',
      '_bmrActions',
    ])
  })

  it('#617 maps category→TaxonomyStackCell and inventory→StockCell on products', () => {
    const col = productsCollection()
    applyListCellElevation([col])
    const cellFor = (name: string) =>
      (
        (col.fields as { name?: string; admin?: { components?: { Cell?: string } } }[]).find(
          (f) => f.name === name,
        ) as { admin?: { components?: { Cell?: string } } }
      )?.admin?.components?.Cell
    expect(cellFor('category')).toContain('TaxonomyStackCell')
    expect(cellFor('inventory')).toContain('StockCell')
  })
})
