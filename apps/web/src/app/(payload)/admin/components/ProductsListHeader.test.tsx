import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductsListHeader } from './ProductsListHeader'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/collections/products',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Admin GUI — ProductsListHeader Catalog Telemetry', () => {
  it('#515 ProductsListHeader renders 4 MetricCard telemetry items', () => {
    const html = renderToStaticMarkup(
      <ProductsListHeader
        stats={{
          totalCount: 42,
          inStockCount: 38,
          lowStockCount: 4,
          categoryCount: 12,
        }}
      />
    )

    expect(html).toContain('bmr-metric-card')
    expect(html).toContain('TOTAL PRODUCTS')
    expect(html).toContain('IN STOCK')
    expect(html).toContain('LOW INVENTORY')
    expect(html).toContain('HARDWARE CATEGORIES')
    expect(html).toContain('42')
    expect(html).toContain('38')
    expect(html).toContain('4')
    expect(html).toContain('12')
  })

  it('#516 ProductsListHeader renders FilterPills facet rail with product inventory categories', () => {
    const html = renderToStaticMarkup(
      <ProductsListHeader
        stats={{
          totalCount: 42,
          inStockCount: 38,
          lowStockCount: 4,
          categoryCount: 12,
        }}
      />
    )

    expect(html).toContain('bmr-filter-pills')
    expect(html).toContain('All Products')
    expect(html).toContain('In Stock')
    expect(html).toContain('Low Stock')
    expect(html).toContain('Published')
  })

  it('#517 ProductsListHeader renders operational AlertBanner when low stock threshold is reached', () => {
    const html = renderToStaticMarkup(
      <ProductsListHeader
        stats={{
          totalCount: 42,
          inStockCount: 38,
          lowStockCount: 4,
          categoryCount: 12,
        }}
      />
    )

    expect(html).toContain('bmr-alert-banner')
    expect(html).toContain('Catalog Products &amp; Inventory')
    expect(html).toContain('Live stock levels, pricing tiers, and builder compatibility integration')
    expect(html).toContain('Low Stock Alert')
  })

  it('#518 ProductsListHeader contains zero raw hex codes and zero inline style colors', () => {
    const html = renderToStaticMarkup(<ProductsListHeader />)

    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(html).not.toMatch(/style="[^"]*color\s*:/)
  })

  it('#519 ProductsListHeader renders action buttons with Button and Link primitives', () => {
    const html = renderToStaticMarkup(<ProductsListHeader />)

    expect(html).toContain('bmr-btn')
    expect(html).toContain('Export Catalog')
    expect(html).toContain('Create Product')
    // Create opens the slide-over DocumentDrawer, tagged with the slug
    expect(html).toContain('data-create-drawer="products"')
    expect(html).not.toContain('/admin/collections/products/create')
  })
})
