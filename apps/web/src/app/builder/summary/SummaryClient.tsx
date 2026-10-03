'use client'

import { useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createRuleEngine, type ComponentSpecEntry } from '@buildmyrig/lib'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { formatEUR } from '@/components/ui/Price'
import { useBuilderIndex } from '../useBuilderIndex'
import { useBuilderStore } from '../builder-store'
import { useBuildActions } from '../kit/useBuildActions'
import { WarningsPanel } from '../configure/WarningsPanel'

export function SummaryClient() {
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

  // Save/cart/share actions live in the design kit (entry 50 P2): same
  // fetches and state machines for every consumer — here they drive the
  // same buttons and labels as before.
  const {
    saveToAccount, addToCart, share,
    saveState, saveView, cartState, shareState, cartLoading,
  } = useBuildActions(index)
  const { user } = useEcommerce()

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
      <header className="summary__head">
        <h1 className="summary__title">Build summary</h1>
        {templateId && <span className="tag">template draft</span>}
        <Link href="/builder/configure" className="btn btn--ghost">
          Keep editing
        </Link>
      </header>

      <div className="panel">
        <table className="summary-table">
          <thead>
            <tr>
              <th scope="col">Slot</th>
              <th scope="col">Part</th>
              <th scope="col" className="price">Price</th>
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
                        <span className="muted"> · {entry.display.brand}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="muted">Unavailable part</span>
                  )}
                </td>
                <td className="price">{entry ? formatEUR(entry.priceCents) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rail-price">
          <span className="muted">Components total</span>
          <span className="amount">{formatEUR(total)}</span>
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

      <div className="summary__actions">
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
          <span className="state-msg state-msg--error">
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
