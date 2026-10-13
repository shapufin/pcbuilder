import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { UsersListHeader } from './UsersListHeader'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/collections/users',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Admin GUI — UsersListHeader Collection Telemetry', () => {
  it('#510 UsersListHeader renders 5 MetricCard telemetry ribbon items', () => {
    const html = renderToStaticMarkup(
      <UsersListHeader
        stats={{
          totalCount: 64,
          adminCount: 2,
          staffCount: 2,
          customerCount: 60,
          activeCount: 3,
        }}
      />
    )

    expect(html).toContain('bmr-metric-card')
    expect(html).toContain('TOTAL USERS')
    expect(html).toContain('ADMINISTRATORS')
    expect(html).toContain('STAFF &amp; MANAGERS')
    expect(html).toContain('CUSTOMERS')
    expect(html).toContain('ACTIVE TODAY')
    expect(html).toContain('64')
    expect(html).toContain('60')
  })

  it('#511 UsersListHeader renders FilterPills facet rail with role filter categories', () => {
    const html = renderToStaticMarkup(
      <UsersListHeader
        stats={{
          totalCount: 64,
          adminCount: 2,
          staffCount: 2,
          customerCount: 60,
          activeCount: 3,
        }}
      />
    )

    expect(html).toContain('bmr-filter-pills')
    expect(html).toContain('All Users')
    expect(html).toContain('Administrators')
    expect(html).toContain('Staff &amp; Managers')
    expect(html).toContain('Customers')
  })

  it('#512 UsersListHeader renders operational AlertBanner and header description', () => {
    const html = renderToStaticMarkup(<UsersListHeader />)

    expect(html).toContain('bmr-alert-banner')
    expect(html).toContain('User Directory &amp; Access Control')
    expect(html).toContain('Role-based access control, security policies, and session tokens')
    expect(html).toContain('Security Notice')
  })

  it('#513 UsersListHeader contains zero raw hex codes and zero inline style colors', () => {
    const html = renderToStaticMarkup(<UsersListHeader />)

    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(html).not.toMatch(/style="[^"]*color\s*:/)
  })

  it('#514 UsersListHeader renders action buttons with Button primitives', () => {
    const html = renderToStaticMarkup(<UsersListHeader />)

    expect(html).toContain('bmr-btn')
    expect(html).toContain('Export CSV')
  })
})
