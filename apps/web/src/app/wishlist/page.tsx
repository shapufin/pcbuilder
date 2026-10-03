import type { Metadata } from 'next'
import { WishlistClient } from './WishlistClient'
import '../shop/shop.css'

export const metadata: Metadata = { title: 'Wishlist | BuildMyRig' }

/** Step A (entry 18): localStorage-first wishlist (07-ux-plan local-first). */
export default function WishlistPage() {
  return (
    <main className="page">
      <h1 className="page__title">Wishlist</h1>
      <p className="page__lead">
        Saved on this device — your list lives in this browser (account sync is coming later).
      </p>
      <WishlistClient />
    </main>
  )
}
