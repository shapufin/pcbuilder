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
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>{heading ?? 'Get build deals in your inbox'}</h2>
      {consent ? <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 20px' }}>{consent}</p> : null}
      {state === 'done' ? (
        <p style={{ color: 'var(--color-success)', fontWeight: 700 }}>Thanks — check your inbox to confirm.</p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 10, maxWidth: 460, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            style={{
              flex: '1 1 240px',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: 15,
            }}
          />
          <button
            type="submit"
            disabled={state === 'busy'}
            style={{
              padding: '12px 22px',
              borderRadius: 10,
              border: 0,
              background: 'var(--color-primary-strong)',
              color: 'var(--color-on-primary)',
              fontWeight: 700,
              cursor: state === 'busy' ? 'wait' : 'pointer',
            }}
          >
            {state === 'busy' ? 'Joining…' : 'Subscribe'}
          </button>
        </form>
      )}
      {state === 'error' ? <p style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 12 }}>{message}</p> : null}
    </section>
  )
}
