import type { Metadata } from 'next'
import { WishlistClient } from './WishlistClient'

export const metadata: Metadata = { title: 'Wishlist | BuildMyRig' }

/** Step A (entry 18): localStorage-first wishlist (07-ux-plan local-first). */
export default function WishlistPage() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>Wishlist</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 24px' }}>
        Saved on this device — your list lives in this browser (account sync is coming later).
      </p>
      <WishlistClient />
    </main>
  )
}
