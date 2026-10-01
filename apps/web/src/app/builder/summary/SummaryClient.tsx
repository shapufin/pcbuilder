'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createRuleEngine, type ComponentSpecEntry } from '@buildmyrig/lib'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { flyToCart } from '@/lib/fly-to-cart'
import { track } from '@/lib/analytics'
import { useCartDrawerStore } from '@/lib/cart-drawer-store'
import { useBuilderIndex } from '../useBuilderIndex'
import { useBuilderStore } from '../builder-store'
import { WarningsPanel } from '../configure/WarningsPanel'

const eur = (cents: number): string => `€${(cents / 100).toFixed(2)}`

type SavedBuild = { buildId: string; shareId: string }

export function SummaryClient() {
  const router = useRouter()
  const { index, status, retry } = useBuilderIndex()
  // Hydration gate: false during SSR, flips to true on the client without an
  // effect (react-hooks/set-state-in-effect).
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const selections = useBuilderStore((s) => s.selections)
  const templateId = useBuilderStore((s) => s.templateId)
  const savedBuild = useBuilderStore((s) => (s.buildId && s.shareId ? { buildId: s.buildId, shareId: s.shareId } : null))
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
  const engine = useMemo(() => (index ? createRuleEngine(index) : null), [index])
  const result = useMemo(() => (engine ? engine.evaluate(selections) : null), [engine, selections])

  const entryOf = (id: string): ComponentSpecEntry | undefined =>
    index?.components.find((c) => c.id === id)

  const rows = categories.flatMap((category) =>
    (selections[category.id] ?? []).map((id) => ({ category, entry: entryOf(id) })),
  )
  const total = rows.reduce((sum, row) => sum + (row.entry?.priceCents ?? 0), 0)
  const missing = categories.filter((c) => c.required && (selections[c.id] ?? []).length === 0)

  /** POST /api/builder/builds — the client never sends a price; the server re-resolves it. */
  const ensureSavedBuild = async (): Promise<SavedBuild | null> => {
    if (savedBuild) return savedBuild
    const slots = categories
      .filter((c) => (selections[c.id] ?? []).length > 0)
      .map((c) => ({ categoryId: c.id, componentIds: selections[c.id] }))
    try {
      const res = await fetch('/api/builder/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
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
   * signed-in users claim right after saving so /account lists it. */
  const saveToAccount = async () => {
    if (!user) {
      track('Sign In To Save')
      router.push('/auth/login?next=%2Fbuilder%2Fsummary')
      return
    }
    setSaveState('saving')
    const saved = await ensureSavedBuild()
    if (!saved) {
      setSaveState('error')
      return
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
      } else if (res.status === 401) {
        router.push('/auth/login?next=%2Fbuilder%2Fsummary')
      } else {
        setSaveState('error')
      }
    } catch {
      setSaveState('error')
    }
  }

  const addToCart = async (from?: DOMRect) => {
    setCartState('adding')
    const saved = await ensureSavedBuild()
    if (!saved) {
      setCartState('error')
      return
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
      await refreshCart()
      if (from) flyToCart(from, 'Custom build')
      openCartDrawer()
      setCartState('added')
      track('Add Build to Cart')
    } catch {
      setCartState('error')
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

  if (!hydrated || status === 'loading') {
    return (
      <main className="builder-page summary" aria-busy="true">
        <div className="skeleton" style={{ height: 48 }} />
        <div className="skeleton" style={{ height: 240 }} />
        <p className="state-msg" role="status">Loading your build…</p>
      </main>
    )
  }

  if (status === 'error' || !index || !result) {
    return (
      <main className="builder-page summary">
        <div className="error-banner" role="alert">
          <span>Could not load the compatibility index.</span>
          <button type="button" className="btn" onClick={retry}>Retry</button>
        </div>
      </main>
    )
  }

  if (rows.length === 0) {
    return (
      <main className="builder-page summary">
        <h1>Build summary</h1>
        <p className="state-msg">Your build is empty.</p>
        <div>
          <Link href="/builder/configure" className="btn btn--primary">Start configuring</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="builder-page summary">
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-3xl)' }}>Build summary</h1>
        {templateId && <span className="tag">template draft</span>}
        <Link href="/builder/configure" className="btn btn--ghost" style={{ marginLeft: 'auto' }}>
          Keep editing
        </Link>
      </header>

      <div className="panel">
        <table className="summary-table">
          <thead>
            <tr>
              <th scope="col">Slot</th>
              <th scope="col">Part</th>
              <th scope="col" style={{ textAlign: 'right' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ category, entry }) => (
              <tr key={`${category.id}-${entry?.id}`}>
                <td>{category.name}{category.required ? '' : ' (optional)'}</td>
                <td>
                  {entry ? (
                    <>
                      {entry.display?.name ?? entry.id}
                      {entry.display?.brand ? (
                        <span style={{ color: 'var(--color-text-muted)' }}> · {entry.display.brand}</span>
                      ) : null}
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>Unavailable part</span>
                  )}
                </td>
                <td className="price">{entry ? eur(entry.priceCents) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rail-price">
          <span style={{ color: 'var(--color-text-muted)' }}>Components total</span>
          <span className="amount">{eur(total)}</span>
        </div>

        <p className="state-msg">
          Final price, stock and compatibility are re-validated on the server before checkout.
        </p>

        {missing.length > 0 && (
          <div className="error-banner" role="alert">
            <span>Missing required slots: {missing.map((c) => c.name).join(', ')}</span>
            <Link href="/builder/configure" className="btn">Finish your build</Link>
          </div>
        )}

        <WarningsPanel result={result} />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="btn"
          onClick={() => void share()}
          disabled={missing.length > 0}
          title={missing.length > 0 ? 'Finish required slots first' : 'Copy a public link to this build'}
        >
          <motion.span
            key={shareState}
            initial={shareState === 'copied' ? { scale: 0.85 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 16 }}
            style={{ display: 'inline-block' }}
          >
            {shareState === 'copied' ? 'Link copied ✓' : 'Share link'}
          </motion.span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void saveToAccount()}
          disabled={missing.length > 0 || saveState === 'saving'}
          title={
            missing.length > 0
              ? 'Finish required slots first'
              : user
                ? 'Save this build to your account'
                : 'Sign in to keep this build'
          }
        >
          {saveView === 'saving'
            ? 'Saving…'
            : saveView === 'saved'
              ? 'Saved ✓'
              : saveView === 'error'
                ? 'Save failed — retry'
                : !user
                  ? 'Sign in to save'
                  : 'Save build'}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            void addToCart(rect)
          }}
          disabled={missing.length > 0 || cartState === 'adding' || cartLoading}
        >
          {cartState === 'adding'
            ? 'Adding…'
            : cartState === 'added'
              ? 'Added to cart ✓'
              : cartState === 'error'
                ? 'Add to cart failed — retry'
                : 'Add to cart'}
        </button>
        {cartState === 'added' && (
          <Link href="/cart" className="btn btn--ghost">
            View cart
          </Link>
        )}
        {cartState === 'error' && (
          <span className="state-msg" style={{ color: 'var(--color-danger)' }}>
            Could not save the build — check required slots and try again.
          </span>
        )}
        {missing.length === 0 && cartState === 'idle' && (
          <span className="state-msg">The build is saved on the server; price is re-validated at checkout.</span>
        )}
      </div>
    </main>
  )
}
