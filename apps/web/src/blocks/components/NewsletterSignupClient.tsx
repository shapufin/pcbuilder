'use client'

import { useState } from 'react'

export function NewsletterSignupClient({
  heading,
  consent,
}: {
  heading?: string
  consent?: string
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('busy')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      if (!res.ok) throw new Error(body.error ?? body.message ?? 'Subscription failed')
      setState('done')
      setEmail('')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Subscription failed')
    }
  }

  return (
    <section className="blk blk--narrow blk--center">
      <h2 className="blk__title">{heading ?? 'Get build deals in your inbox'}</h2>
      {consent ? <p className="blk__lead">{consent}</p> : null}
      {state === 'done' ? (
        <p className="state-msg state-msg--success">Thanks — check your inbox to confirm.</p>
      ) : (
        <form onSubmit={submit} className="newsletter__form">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="input newsletter__input"
          />
          <button type="submit" disabled={state === 'busy'} className="btn btn--primary">
            {state === 'busy' ? 'Joining…' : 'Subscribe'}
          </button>
        </form>
      )}
      {state === 'error' ? <p className="state-msg state-msg--error">{message}</p> : null}
    </section>
  )
}
