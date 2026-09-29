import React from 'react'
import './globals.css'
import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import { EcommerceShell } from '../components/EcommerceShell'
import { CartBadge } from '../components/CartBadge'
import { SiteFooter } from '../components/SiteFooter'
import { JsonLd, organizationJsonLd } from '@/lib/jsonld'

// Plausible (12-integrations-ops.md): script only when a domain is configured,
// so dev/CI stay cookie-consent-free and offline.
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

export const metadata: Metadata = {
  // Pages that don't define generateMetadata fall back here; pages that do
  // own their full title (existing routes already append " | BuildMyRig").
  title: 'BuildMyRig — custom PCs, configured your way',
  description: 'Pre-built gaming and creator PCs, or configure your own — step by step.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <JsonLd data={organizationJsonLd()} />
        {plausibleDomain ? (
          <Script src="https://plausible.io/js/script.js" data-domain={plausibleDomain} strategy="afterInteractive" />
        ) : null}
        <EcommerceShell>
          <header style={{ padding: '16px 24px', display: 'flex', gap: 24, alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
            <Link href="/" style={{ fontWeight: 800, fontSize: 18, color: '#e2e8f0', textDecoration: 'none' }}>
              BuildMyRig
            </Link>
            <Link href="/shop/components" style={{ color: '#94a3b8', textDecoration: 'none' }}>Shop</Link>
            <Link href="/builder" style={{ color: '#94a3b8', textDecoration: 'none' }}>Builder</Link>
            <Link
              href="/cart"
              id="cart-anchor"
              style={{ color: '#94a3b8', textDecoration: 'none', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}
            >
              Cart
              <CartBadge />
            </Link>
          </header>
          {children}
          <SiteFooter />
        </EcommerceShell>
      </body>
    </html>
  )
}
