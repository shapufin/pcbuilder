'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { sanitizeNext } from '@/lib/auth'
import '../auth.css'

const login = async (email: string, password: string): Promise<boolean> => {
  const res = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return res.ok
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter()
  const { onLogin } = useEcommerce()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const target = () => sanitizeNext(next) ?? '/account'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(
          res.status === 409
            ? (body.error ?? 'An account with this email already exists.')
            : res.status === 429
              ? 'Too many attempts — wait a minute and try again.'
              : res.status === 400
                ? 'Enter a valid email and a password of at least 8 characters.'
                : 'Registration failed — try again.',
        )
        return
      }
      if (await login(email, password)) {
        await onLogin()
        router.push(target())
        router.refresh()
        return
      }
      // Account exists but auto-login failed — hand over to the sign-in form.
      router.push(`/auth/login?next=${encodeURIComponent(target())}`)
    } catch {
      setError('Registration failed — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <h1 className="auth-page__title">Create account</h1>
      <p className="auth-page__lead">Save builds, track orders and check out faster.</p>
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label htmlFor="register-email" className="field__label">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
          />
        </div>
        <div className="field">
          <label htmlFor="register-password" className="field__label">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="input"
            aria-describedby="register-password-hint"
          />
          <p className="field__hint" id="register-password-hint">
            Minimum 8 characters.
          </p>
        </div>
        <button type="submit" disabled={busy} className="btn btn--primary btn--full">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      {error ? (
        <p role="alert" className="auth-form__error">
          {error}
        </p>
      ) : null}
      <p className="auth-page__foot">
        Already have an account? <Link href="/auth/login">Sign in</Link>
      </p>
    </main>
  )
}
