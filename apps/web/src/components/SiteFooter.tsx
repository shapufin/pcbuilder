import Link from 'next/link'

const links: Array<{ href: string; label: string }> = [
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
]

export function SiteFooter() {
  return (
    <footer
      data-testid="site-footer"
      style={{ marginTop: 48, padding: '24px', borderTop: '1px solid #1e293b', fontSize: 14 }}
    >
      <nav style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{ color: '#94a3b8', textDecoration: 'none' }}>
            {l.label}
          </Link>
        ))}
      </nav>
      <p style={{ color: '#64748b', margin: 0 }}>
        © {new Date().getFullYear()} BuildMyRig. All rights reserved.
      </p>
    </footer>
  )
}
