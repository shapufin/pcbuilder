import React from 'react'
import '@buildmyrig/ui/tokens.css'
import './globals.css'
import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import { EcommerceShell } from '../components/EcommerceShell'
import { CartBadge } from '../components/CartBadge'
import { CartDrawer } from '../components/CartDrawer'
import { AccountNav } from '../components/AccountNav'
import { WishlistNav } from '../components/WishlistNav'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const siteSettings = await getSiteSettings()
  const themeCss = await getThemeCss()
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: themeCss }} />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <JsonLd data={organizationJsonLd()} />
        {plausibleDomain ? (
          <Script src="https://plausible.io/js/script.js" data-domain={plausibleDomain} strategy="afterInteractive" />
        ) : null}
        <EcommerceShell>
          <header
            style={{
              padding: '16px 24px',
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              flexWrap: 'wrap',
              borderBottom: '1px solid var(--color-surface)',
            }}
          >
            <Link href="/" style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-text)', textDecoration: 'none' }}>
              BuildMyRig
            </Link>
            {siteSettings.navLinks.map((l, i) => (
              <Link key={`${l.url}-${i}`} href={l.url} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
            <form action="/shop/search" method="get" role="search" aria-label="Site search" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="search"
                name="q"
                placeholder="Search…"
                aria-label="Search products"
                style={{
                  width: 150,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: 13,
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 0,
                  background: 'var(--color-primary-strong)',
                  color: 'var(--color-on-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </form>
            <AccountNav />
            <WishlistNav />
            <Link
              href="/cart"
              id="cart-anchor"
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Cart
              <CartBadge />
            </Link>
          </header>
          <CartDrawer />
          <div id="main-content">{children}</div>
          <SiteFooter />
        </EcommerceShell>
      </body>
    </html>
  )
}
