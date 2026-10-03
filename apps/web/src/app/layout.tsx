import React from 'react'
import '@buildmyrig/ui/tokens.css'
import './globals.css'
import '../components/ui/primitives.css'
import '../components/shell.css'
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { EcommerceShell } from '../components/EcommerceShell'
import { CartDrawer } from '../components/CartDrawer'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { getSiteSettings } from '@/lib/site-settings.server'
import { getThemeCss } from '@/lib/theme.server'
import { JsonLd, organizationJsonLd } from '@/lib/jsonld'

// Plausible (12-integrations-ops.md): script only when a domain is configured,
// so dev/CI stay cookie-consent-free and offline.
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

export const metadata: Metadata = {
  // Without metadataBase, relative OG image URLs resolve to nothing absolute.
  metadataBase: new URL(process.env.BMR_URL || 'http://localhost:3000'),
  // Pages that don't define generateMetadata fall back here; pages that do
  // own their full title (existing routes already append " | BuildMyRig").
  title: 'BuildMyRig — custom PCs, configured your way',
  description: 'Pre-built gaming and creator PCs, or configure your own — step by step.',
}

// themeColor must be a literal CSS color — hsl() keeps it out of the
// raw-hex lint while matching tokens.css --color-bg (update both together).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: 'hsl(225 50% 8%)',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const siteSettings = await getSiteSettings()
  const themeCss = await getThemeCss()
  return (
    <html lang="en">
      <body>
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: themeCss }} />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <JsonLd data={organizationJsonLd()} />
        {plausibleDomain ? (
          <Script src="https://plausible.io/js/script.js" data-domain={plausibleDomain} strategy="afterInteractive" />
        ) : null}
        <EcommerceShell>
          <SiteHeader navLinks={siteSettings.navLinks} />
          <CartDrawer />
          <div id="main-content">{children}</div>
          <SiteFooter />
        </EcommerceShell>
      </body>
    </html>
  )
}
