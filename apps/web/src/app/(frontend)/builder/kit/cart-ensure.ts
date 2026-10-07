/**
 * Fresh-guest cart bridge (entry 67). When the provider has no cart the
 * add-build flow mints one via POST /api/carts — but the plugin's context
 * omits `cartID` (entry-23 F2 gap) and its `refreshCart()` no-ops without
 * it, so a cart created outside the provider was invisible to the drawer
 * and unrecoverable on reload: only `cart_secret` was written, never the
 * `cart` id key the provider's syncLocalStorage restores from.
 *
 * Persisting BOTH keys fixes reload-restore and stops every deploy minting
 * a new orphan; `adoptCart` (exposed by the repo's pnpm patch on
 * @payloadcms/plugin-ecommerce) then adopts it into live provider state.
 */

export interface CartHandle {
  cartId?: string | number
  secret?: string
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Resolve the active cart the way addToCart always has — context cartID,
 * then the loaded cart's id, then the synced localStorage key.
 */
export function resolveCartHandle(
  cartID: string | number | undefined,
  cart: { id?: string | number } | null | undefined,
  storage: Pick<StorageLike, 'getItem'>,
): CartHandle {
  return {
    cartId: cartID ?? cart?.id ?? storage.getItem('cart') ?? undefined,
    secret: storage.getItem('cart_secret') ?? undefined,
  }
}

/**
 * Persist a minted cart under the same keys the plugin's syncLocalStorage
 * writes ('cart' + 'cart_secret') so the next mount can restore it and
 * subsequent addToCart calls reuse it instead of minting another orphan.
 */
export function persistCartHandle(handle: { cartId: string | number; secret?: string }, storage: StorageLike): void {
  storage.setItem('cart', String(handle.cartId))
  if (handle.secret) storage.setItem('cart_secret', handle.secret)
}
