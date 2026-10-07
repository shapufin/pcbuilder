import Link from 'next/link'
import { Cpu } from 'lucide-react'
import { getSiteSettings } from '@/lib/site-settings.server'

/**
 * Nexus pack footer (entry 71) — same site-settings footerLinks as the
 * shared footer, styled in the Nexus design language (mono labels, cyan
 * accents, telemetry-style legal line).
 */
export async function NexusFooter() {
  const { footerLinks } = await getSiteSettings()
  return (
    <footer data-testid="site-footer" className="nx-footer">
      <div className="nx-footer__inner">
        <div className="nx-footer__brand">
          <Link href="/" className="nx-brand">
            <span className="nx-brand__mark">
              <Cpu size={16} aria-hidden />
            </span>
            <span className="nx-brand__text">
              <span className="nx-brand__name">
                Nexus<span className="nx-brand__light">Rig</span>
              </span>
              <span className="nx-brand__sub">Atelier Silicon</span>
            </span>
          </Link>
          <p className="nx-footer__tag">Custom PCs, configured your way.</p>
        </div>
        <nav className="nx-footer__nav" aria-label="Footer">
          {footerLinks.map((l, i) => (
            <Link key={`${l.url}-${i}`} href={l.url} className="nx-footer__link">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="nx-footer__legal">
        <span>© {new Date().getFullYear()} BuildMyRig — Nexus design pack</span>
        <span className="nx-footer__legal-mono">CLEANROOM CALIBRATED // ISO-04</span>
      </div>
    </footer>
  )
}
