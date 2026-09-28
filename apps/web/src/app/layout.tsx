import React from 'react'
import './globals.css'
import Link from 'next/link'
import { EcommerceShell } from '../components/EcommerceShell'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <EcommerceShell>
          <header style={{ padding: '16px 24px', display: 'flex', gap: 24, alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
            <Link href="/" style={{ fontWeight: 800, fontSize: 18, color: '#e2e8f0', textDecoration: 'none' }}>
              BuildMyRig
            </Link>
            <Link href="/shop/components" style={{ color: '#94a3b8', textDecoration: 'none' }}>Shop</Link>
            <Link href="/builder" style={{ color: '#94a3b8', textDecoration: 'none' }}>Builder</Link>
            <Link href="/cart" style={{ color: '#94a3b8', textDecoration: 'none', marginLeft: 'auto' }}>Cart</Link>
          </header>
          {children}
        </EcommerceShell>
      </body>
    </html>
  )
}
