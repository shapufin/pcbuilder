import Link from 'next/link'
import { getSiteSettings } from '@/lib/site-settings.server'

/**
 * Entry 18 (Step A): links come from the `site-settings` global
 * (admin-editable; defaults in @buildmyrig/plugin-pages while no doc exists).
 */
export async function SiteFooter() {
  const { footerLinks } = await getSiteSettings()
  return (
    <footer
      data-testid="site-footer"
      style={{ marginTop: 48, padding: '24px', borderTop: '1px solid var(--color-surface)', fontSize: 14 }}
    >
      <nav style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
        {footerLinks.map((l, i) => (
          <Link key={`${l.url}-${i}`} href={l.url} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            {l.label}
          </Link>
        ))}
      </nav>
      <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
        © {new Date().getFullYear()} BuildMyRig. All rights reserved.
      </p>
    </footer>
  )
}
