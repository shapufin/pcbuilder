'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { Price } from '@/components/ui/Price'

type Tier = {
  id: string
  name: string
  badge?: string
  description?: string
  features: string[]
  priceCents: number
}

type CartLine = { lineType?: string; packagingTier?: string | number }

/**
 * Entry 71 — packaging tier picker (Nexus checkout upsell, ported from the
 * source app's PACKAGING_TIERS radio cards). Server-authoritative: the UI
 * posts the tier id; /api/carts/:id/packaging rewrites the cart's packaging
 * line and recomputeCartTotals prices it — the displayed total never comes
 * from the client.
 */
export function PackagingPicker({ disabled }: { disabled?: boolean }) {
  // adoptCart (entry-67 patch) over refreshCart: refreshCart omits the guest
  // secret from the refetch → 403 for secret-gated carts.
  const { cart, adoptCart } = useEcommerce()
  const cartId = (cart as { id?: string | number } | undefined)?.id
  const selected = useMemo(
    () =>
      ((cart as { items?: CartLine[] } | undefined)?.items ?? []).find(
        (i) => i.lineType === 'packaging',
      )?.packagingTier,
    [cart],
  )

  const [tiers, setTiers] = useState<Tier[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/globals/packaging-tiers')
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (cancelled) return
        const raw = (doc as { tiers?: Array<Record<string, unknown>> } | null)?.tiers
        if (!Array.isArray(raw)) {
          setTiers([])
          return
        }
        setTiers(
          raw
            .filter((t) => t && t.enabled !== false && typeof t.name === 'string')
            .map((t) => ({
              id: String(t.id ?? ''),
              name: String(t.name),
              badge: typeof t.badge === 'string' ? t.badge : undefined,
              description: typeof t.description === 'string' ? t.description : undefined,
              features: Array.isArray(t.features)
                ? t.features
                    .map((f) => (typeof f === 'object' && f !== null ? (f as { text?: unknown }).text : f))
                    .filter((f): f is string => typeof f === 'string' && f.length > 0)
                : [],
              priceCents: typeof t.priceCents === 'number' ? t.priceCents : 0,
            }))
            .filter((t) => t.id),
        )
      })
      .catch(() => {
        if (!cancelled) setTiers([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const pick = async (tier: string | null) => {
    if (!cartId || busy) return
    setBusy(true)
    setError('')
    try {
      const secret = window.localStorage.getItem('cart_secret') ?? undefined
      const res = await fetch(`/api/carts/${cartId}/packaging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, secret }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error || 'Could not update packaging.')
        return
      }
      await adoptCart(cartId as number, { secret })
    } catch {
      setError('Could not update packaging — try again.')
    } finally {
      setBusy(false)
    }
  }

  // Empty/global-missing → render nothing (telemetry-strip contract: absent
  // data hides the surface rather than showing a broken one).
  if (!tiers || tiers.length === 0) return null

  return (
    <fieldset className="packaging-picker" disabled={disabled || busy || !cartId}>
      <legend className="checkout-form__legend">Packaging</legend>
      <div className="packaging-picker__grid" role="radiogroup" aria-label="Packaging tier">
        <label className={`packaging-card${selected == null ? ' packaging-card--active' : ''}`}>
          <input
            type="radio"
            name="packaging-tier"
            checked={selected == null}
            onChange={() => pick(null)}
          />
          <span className="packaging-card__name">Standard</span>
          <span className="packaging-card__price">Included</span>
        </label>
        {tiers.map((t) => (
          <label
            key={t.id}
            className={`packaging-card${String(selected) === t.id ? ' packaging-card--active' : ''}`}
          >
            <input
              type="radio"
              name="packaging-tier"
              checked={String(selected) === t.id}
              onChange={() => pick(t.id)}
            />
            <span className="packaging-card__name">
              {t.name}
              {t.badge && <span className="packaging-card__badge">{t.badge}</span>}
            </span>
            {t.description && <span className="packaging-card__desc">{t.description}</span>}
            {t.features.length > 0 && (
              <span className="packaging-card__features">
                {t.features.map((f) => (
                  <span key={f} className="packaging-card__feature">
                    {f}
                  </span>
                ))}
              </span>
            )}
            <span className="packaging-card__price">
              {t.priceCents > 0 ? <>+ <Price cents={t.priceCents} /></> : 'Free'}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p className="checkout-msg checkout-msg--err" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
