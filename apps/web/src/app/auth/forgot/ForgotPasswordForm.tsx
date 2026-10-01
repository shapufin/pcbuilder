'use client'

import { useState } from 'react'
import Link from 'next/link'

const input: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 15,
}

const button: React.CSSProperties = {
  padding: '12px 22px',
  borderRadius: 10,
  border: 0,
  background: 'var(--color-primary-strong)',
  color: 'var(--color-on-primary)',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 429) {
        setError('Too many attempts — wait a minute and try again.')
        return
      }
      if (!res.ok) {
        setError('That does not look like a valid email address.')
        return
      }
      setSent(true)
    } catch {
      // The endpoint answers 200 even on send failures (anti-enumeration);
      // only a network-level failure lands here.
      setError('Could not reach the server — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <main style={{ maxWidth: 460, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>Check your inbox</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 24px' }}>
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your
          password. The link expires in 1 hour.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Wrong address or nothing after a few minutes?{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            style={{
              ...button,
              padding: '0',
              background: 'none',
              color: 'var(--color-primary-hover)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 24 }}>
          <Link href="/auth/login" style={{ color: 'var(--color-primary-hover)' }}>
            Back to sign in
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 460, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>Forgot password?</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 24px' }}>
        Enter your account email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--color-border-strong)' }}>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={input}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{ ...button, cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 14 }}>
          {error}
        </p>
      ) : null}
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 24 }}>
        Remembered it?{' '}
        <Link href="/auth/login" style={{ color: 'var(--color-primary-hover)' }}>
          Sign in
        </Link>
      </p>
    </main>
  )
}
