import Link from 'next/link'
import { getSiteSettings } from '@/lib/site-settings.server'

/**
 * Entry 18 (Step A): links come from the `site-settings` global
 * (admin-editable; defaults in @buildmyrig/plugin-pages while no doc exists).
 * Phase-0 restyle: brand column + link nav + legal line.
 */
export async function SiteFooter() {
  const { footerLinks } = await getSiteSettings()
  return (
    <footer data-testid="site-footer" className="site-footer">
      <div className="site-footer__inner">
        <div>
          <Link href="/" className="site-footer__logo">
            BuildMyRig
          </Link>
          <p className="site-footer__tag">Custom PCs, configured your way.</p>
        </div>
        <nav className="site-footer__nav" aria-label="Footer">
          {footerLinks.map((l, i) => (
            <Link key={`${l.url}-${i}`} href={l.url}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="site-footer__legal">© {new Date().getFullYear()} BuildMyRig. All rights reserved.</p>
    </footer>
  )
}
