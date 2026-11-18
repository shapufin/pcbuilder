import Link from 'next/link'
import { getSiteSettings } from '@/lib/site-settings.server'

/**
 * Aether pack footer (entry 124) — luxury engineering laboratory footer
 * ported from SHOP_THEME_2.tsx with data-testid="site-footer" preservation.
 */
export async function AetherFooter() {
  const { footerLinks } = await getSiteSettings()
  return (
    <footer data-testid="site-footer" className="ae-footer">
      <div className="ae-footer__container">
        <div>
          <div className="ae-u-flex ae-u-items-center ae-u-gap-2">
            <div className="ae-brand__badge">A+</div>
            <span className="ae-brand__text">AETHER // RIGS</span>
          </div>
          <p className="ae-footer__brand-p">
            High-compute PC hardware engineering house and custom liquid workstation laboratory in Zurich.
            Every GPU and rig ships with a 24-hour thermal telemetry certificate.
          </p>
          <div className="ae-newsletter-form">
            <input
              type="email"
              placeholder="Enter email for GPU batch drops..."
              className="ae-u-text-xs"
              readOnly
              value=""
            />
            <button
              type="button"
              className="btn btn-primary ae-u-text-xs ae-footer-x-1"
            >
              Join
            </button>
          </div>
        </div>

        <div>
          <p className="ae-footer__col-title">Telemetry Labs</p>
          <Link href="/shop" className="ae-footer__link">
            Hardware Filter Studio
          </Link>
          <Link href="/builder" className="ae-footer__link">
            Rig Build Configurator
          </Link>
          <Link href="/explorer" className="ae-footer__link">
            3D Slot &amp; X-Ray Telemetry
          </Link>
          <Link href="/shop/pre-built" className="ae-footer__link">
            Pre-Validated Rigs
          </Link>
        </div>

        <div>
          <p className="ae-footer__col-title">Storefront &amp; Legal</p>
          {footerLinks.map((l, i) => (
            <Link key={`${l.url}-${i}`} href={l.url} className="ae-footer__link">
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="ae-footer__bottom">
        <span>© {new Date().getFullYear()} BuildMyRig — Aether Engineering Pack</span>
        <span className="ae-u-font-mono ae-u-text-xs ae-u-text-subtle">
          ZURICH WORKSTATION LAB // 24H BURN-IN TELEMETRY CERTIFIED
        </span>
      </div>
    </footer>
  )
}
