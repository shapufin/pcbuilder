'use client'

import { useState } from 'react'
import Link from 'next/link'
import '../auth.css'

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
      <main className="auth-page">
        <h1 className="auth-page__title">Check your inbox</h1>
        <p className="auth-page__lead">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your
          password. The link expires in 1 hour.
        </p>
        <p className="auth-page__lead">
          Wrong address or nothing after a few minutes?{' '}
          <button type="button" onClick={() => setSent(false)} className="btn btn--link">
            Try again
          </button>
        </p>
        <p className="auth-page__foot">
          <Link href="/auth/login">Back to sign in</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <h1 className="auth-page__title">Forgot password?</h1>
      <p className="auth-page__lead">Enter your account email and we&apos;ll send you a reset link.</p>
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label htmlFor="forgot-email" className="field__label">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
          />
        </div>
        <button type="submit" disabled={busy} className="btn btn--primary btn--full">
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {error ? (
        <p role="alert" className="auth-form__error">
          {error}
        </p>
      ) : null}
      <p className="auth-page__foot">
        Remembered it? <Link href="/auth/login">Sign in</Link>
      </p>
    </main>
  )
}
