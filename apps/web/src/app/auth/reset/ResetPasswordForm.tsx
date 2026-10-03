'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import '../auth.css'

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const { onLogin } = useEcommerce()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(
          res.status === 403
            ? (body.error ?? 'This reset link is invalid or has expired.')
            : res.status === 429
              ? 'Too many attempts — wait a minute and try again.'
              : res.status === 400
                ? 'Password must be at least 8 characters.'
                : 'Password reset failed — try again.',
        )
        return
      }
      // The response Set-Cookie carries the new session (the local API minted
      // a JWT but only our route sets the cookie) — sync ecommerce state too.
      await onLogin()
      router.push('/account')
      router.refresh()
    } catch {
      setError('Password reset failed — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <h1 className="auth-page__title">Reset link incomplete</h1>
        <p className="auth-page__lead">This page needs the reset link from your email.</p>
        <p className="auth-page__foot">
          <Link href="/auth/forgot">Request a new link</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <h1 className="auth-page__title">Set a new password</h1>
      <p className="auth-page__lead">The link expires 1 hour after it was requested and can be used once.</p>
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label htmlFor="reset-password" className="field__label">
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="input"
          />
        </div>
        <div className="field">
          <label htmlFor="reset-confirm" className="field__label">
            Confirm password
          </label>
          <input
            id="reset-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat the password"
            className="input"
          />
        </div>
        <button type="submit" disabled={busy} className="btn btn--primary btn--full">
          {busy ? 'Saving…' : 'Set password'}
        </button>
      </form>
      {error ? (
        <p role="alert" className="auth-form__error">
          {error}
        </p>
      ) : null}
      <p className="auth-page__foot">
        <Link href="/auth/login">Back to sign in</Link>
      </p>
    </main>
  )
}
