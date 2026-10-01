'use client'

import { useState } from 'react'

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 15,
  fontFamily: 'inherit',
}

export function ContactFormClient({
  heading,
  intro,
}: {
  heading?: string
  intro?: string
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('busy')
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Sending failed')
      setState('done')
      setName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Sending failed')
    }
  }

  if (state === 'done') {
    return (
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
          {heading ?? 'Send us a message'}
        </h2>
        <p style={{ color: 'var(--color-success)', fontWeight: 700 }}>
          Thanks — your message is on its way. We reply within one working day.
        </p>
      </section>
    )
  }

  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
        {heading ?? 'Send us a message'}
      </h2>
      {intro ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 15, margin: '0 0 20px' }}>
          {intro}
        </p>
      ) : null}
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
          Your name
          <input
            type="text"
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
          Message
          <textarea
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </label>
        <div>
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
            {state === 'busy' ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
      {state === 'error' ? (
        <p style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 12 }}>{error}</p>
      ) : null}
    </section>
  )
}
