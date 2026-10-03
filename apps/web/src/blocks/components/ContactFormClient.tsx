'use client'

import { useState } from 'react'

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
      <section className="blk blk--narrow">
        <h2 className="blk__title">{heading ?? 'Send us a message'}</h2>
        <p className="state-msg state-msg--success">
          Thanks — your message is on its way. We reply within one working day.
        </p>
      </section>
    )
  }

  return (
    <section className="blk blk--narrow">
      <h2 className="blk__title">{heading ?? 'Send us a message'}</h2>
      {intro ? <p className="blk__lead">{intro}</p> : null}
      <form onSubmit={submit} className="contact-form">
        <label className="field">
          <span className="field__label">Your name</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="input"
          />
        </label>
        <label className="field">
          <span className="field__label">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="input"
          />
        </label>
        <label className="field">
          <span className="field__label">Message</span>
          <textarea
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input"
          />
        </label>
        <div>
          <button type="submit" disabled={state === 'busy'} className="btn btn--primary">
            {state === 'busy' ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
      {state === 'error' ? <p className="state-msg state-msg--error">{error}</p> : null}
    </section>
  )
}
