'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Result banner for the newsletter double opt-in link (audit 2026-11-18 M3):
 * /api/newsletter/confirm redirects to `/?newsletter=confirmed|invalid`.
 * Reads the flag once, then strips it from the URL so a refresh or share
 * doesn't replay the message.
 */
const COPY = {
  confirmed: { tone: 'success', text: "You're subscribed — build deals and restock alerts are on their way." },
  invalid: { tone: 'error', text: 'That confirmation link is invalid or already used. Sign up again to get a fresh one.' },
} as const

type Flag = keyof typeof COPY

// Captured once per page load: the effect below strips the param from the URL,
// and the banner must survive that.
let captured: Flag | null | undefined
const readFlag = (): Flag | null => {
  if (captured === undefined) {
    const flag = new URL(window.location.href).searchParams.get('newsletter')
    captured = flag === 'confirmed' || flag === 'invalid' ? flag : null
  }
  return captured
}
const noopSubscribe = () => () => {}

export function NewsletterNotice() {
  const flag = useSyncExternalStore(noopSubscribe, readFlag, () => null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!flag) return
    const url = new URL(window.location.href)
    url.searchParams.delete('newsletter')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [flag])

  const status = dismissed ? null : flag
  if (!status) return null
  const { tone, text } = COPY[status]
  return (
    <div className={`newsletter-notice state-msg state-msg--${tone}`} role="status" aria-live="polite">
      <span>{text}</span>
      <button type="button" className="newsletter-notice__close" onClick={() => setDismissed(true)} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
