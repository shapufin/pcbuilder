'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BuilderIndex, ComponentSpecEntry } from '@buildmyrig/lib'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { flyToCart } from '@/lib/fly-to-cart'
import { track } from '@/lib/analytics'
import { useCartDrawerStore } from '@/lib/cart-drawer-store'
import { useBuilderStore } from '../builder-store'

export type SavedBuild = { buildId: string; shareId: string }

/** Per-action state machines — designs render button labels/disabled states
 *  from these (via BuilderContext `state.actionStatus` inside the provider,
 *  or the hook's own return outside it). */
export interface BuildActionStatus {
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  saveView: 'idle' | 'saving' | 'saved' | 'error'
  cartState: 'idle' | 'adding' | 'added' | 'error'
  shareState: 'idle' | 'copied'
  cartLoading: boolean
}

/**
 * Design kit (entry 50 P2): le azioni di persistenza del build — save/claim,
 * add-to-cart, share — estratte da SummaryClient così ogni design (e la
 * summary stessa) condivide lo stesso codice, gli stessi fetch e gli stessi
 * contratti (#93, cart-id fallback chain di entry-23).
 *
 * Prende l'index perché chi è FUORI dal BuilderProvider (la summary) ha il
 * suo useBuilderIndex.
 */
export function useBuildActions(index: BuilderIndex | null) {
  const router = useRouter()

  const selections = useBuilderStore((s) => s.selections)
  const rgbColor = useBuilderStore((s) => s.rgbColor)
  // Primitive selectors — an inline object literal here would fail Object.is
  // on every unrelated store update.
  const buildId = useBuilderStore((s) => s.buildId)
  const shareId = useBuilderStore((s) => s.shareId)
  const savedBuild = useMemo(
    () => (buildId && shareId ? { buildId, shareId } : null),
    [buildId, shareId],
  )
  const saveBuild = useBuilderStore((s) => s.saveBuild)

  const { user, cart, cartID, refreshCart, isLoading: cartLoading } = useEcommerce()
  const openCartDrawer = useCartDrawerStore((s) => s.open)
  const [cartState, setCartState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle')
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  // A selection change clears the store's draft ref (#93), so a lingering
  // 'saved' flag refers to a build the no longer matches — show idle instead.
  const saveView = saveState === 'saved' && !savedBuild ? 'idle' : saveState

  const categories = useMemo(
    () => (index ? [...index.categories].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [index],
  )

  const entryOf = (id: string): ComponentSpecEntry | undefined =>
    index?.components.find((c) => c.id === id)

  const rows = categories.flatMap((category) =>
    (selections[category.id] ?? []).map((id) => ({ category, entry: entryOf(id) })),
  )

  /** POST /api/builder/builds — the client never sends a price; the server re-resolves it. */
  const ensureSavedBuild = async (name?: string): Promise<SavedBuild | null> => {
    if (savedBuild) return savedBuild
    const slots = categories
      .filter((c) => (selections[c.id] ?? []).length > 0)
      .map((c) => ({ categoryId: c.id, componentIds: selections[c.id] }))
    try {
      const res = await fetch('/api/builder/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots, rgbColor, ...(name?.trim() ? { name: name.trim() } : {}) }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { id: string; shareId: string }
      const next = { buildId: data.id, shareId: data.shareId }
      saveBuild(next.buildId, next.shareId)
      return next
    } catch {
      return null
    }
  }

  /** Entry 15: sign-in keeps the guest build (claim attaches it to the account);
   * signed-in users claim right after saving so /account lists it.
   * Resolves to true only when save+claim actually succeeded — callers must
   * gate success UI on it (a 422 save must not toast "saved"). */
  const saveToAccount = async (name?: string): Promise<boolean> => {
    if (!user) {
      track('Sign In To Save')
      router.push('/auth/login?next=%2Fbuilder%2Fsummary')
      return false
    }
    setSaveState('saving')
    const saved = await ensureSavedBuild(name)
    if (!saved) {
      setSaveState('error')
      return false
    }
    try {
      const res = await fetch('/api/builder/builds/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId: saved.shareId }),
      })
      if (res.ok) {
        setSaveState('saved')
        track('Save Build')
        return true
      }
      if (res.status === 401) {
        router.push('/auth/login?next=%2Fbuilder%2Fsummary')
      } else {
        setSaveState('error')
      }
      return false
    } catch {
      setSaveState('error')
      return false
    }
  }

  const addToCart = async (from?: DOMRect): Promise<boolean> => {
    setCartState('adding')
    const saved = await ensureSavedBuild()
    if (!saved) {
      setCartState('error')
      return false
    }
    const subItems = rows.map(({ entry }) => ({
      component: entry?.id ?? '',
      quantity: 1,
      name: entry?.display?.name ?? entry?.id ?? 'Part',
    }))
    try {
      const headers = { 'Content-Type': 'application/json' }
      // Entry-23 review F2: the plugin's context value omits `cartID`, so the
      // context fallback alone always created a *second* cart (and the build
      // landed in a cart the provider didn't know about). Use the loaded cart,
      // then the same localStorage key the provider syncs ('cart' — the
      // provider writes it, this only covers the not-yet-restored window).
      let cartId: string | number | undefined =
        cartID ?? (cart as { id?: string | number } | undefined)?.id ?? window.localStorage.getItem('cart') ?? undefined
      let secret = window.localStorage.getItem('cart_secret') ?? undefined
      if (!cartId) {
        const created = await fetch('/api/carts', {
          method: 'POST',
          headers,
          body: JSON.stringify({ currency: 'EUR' }),
        })
        const createdData = (await created.json()) as { doc?: { id: string | number; secret?: string } }
        cartId = createdData.doc?.id
        secret = createdData.doc?.secret
        if (secret) window.localStorage.setItem('cart_secret', secret)
      }
      if (!cartId) throw new Error('could not create cart')
      const res = await fetch(`/api/carts/${cartId}/add-build`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          configuredBuild: saved.buildId,
          buildName: 'Custom build',
          subItems,
          ...(secret ? { secret } : {}),
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `add failed (${res.status})`)
      }
      // The composite line already landed — the post-add steps are cosmetic
      // and must not flip the verdict to error (a retry would double-add).
      try {
        await refreshCart()
      } catch {
        /* drawer rehydrates on its next fetch */
      }
      try {
        if (from) flyToCart(from, 'Custom build')
        openCartDrawer()
        track('Add Build to Cart')
      } catch {
        /* cosmetic steps failed — cart contents are already correct */
      }
      setCartState('added')
      return true
    } catch {
      setCartState('error')
      return false
    }
  }

  const share = async () => {
    const saved = await ensureSavedBuild()
    if (!saved) return
    const url = `${window.location.origin}/build/${saved.shareId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setShareState('copied')
    window.setTimeout(() => setShareState('idle'), 2000)
  }

  return {
    ensureSavedBuild,
    saveToAccount,
    addToCart,
    share,
    saveState,
    saveView,
    cartState,
    shareState,
    cartLoading,
  }
}
