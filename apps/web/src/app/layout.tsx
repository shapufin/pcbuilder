import React from 'react'
import './globals.css'
import Link from 'next/link'
import type { Metadata } from 'next'
import { EcommerceShell } from '../components/EcommerceShell'
import { CartBadge } from '../components/CartBadge'
import { JsonLd, organizationJsonLd } from '@/lib/jsonld'

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
        </EcommerceShell>
      </body>
    </html>
  )
}
