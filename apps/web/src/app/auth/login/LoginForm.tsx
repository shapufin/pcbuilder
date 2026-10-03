'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { sanitizeNext } from '@/lib/auth'
import '../auth.css'

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const { onLogin } = useEcommerce()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError(
          res.status === 429
            ? 'Too many attempts — wait a minute and try again.'
            : 'Invalid email or password.',
        )
        return
      }
      await onLogin()
      router.push(sanitizeNext(next) ?? '/account')
      router.refresh()
    } catch {
      setError('Sign-in failed — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <h1 className="auth-page__title">Sign in</h1>
      <p className="auth-page__lead">Access your orders and saved builds.</p>
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label htmlFor="login-email" className="field__label">
            Email
          </label>
          <input
            id="login-email"
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
          <div className="field__label-row">
            <label htmlFor="login-password" className="field__label">
              Password
            </label>
            <Link href="/auth/forgot">Forgot password?</Link>
          </div>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
          />
        </div>
        <button type="submit" disabled={busy} className="btn btn--primary btn--full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error ? (
        <p role="alert" className="auth-form__error">
          {error}
        </p>
      ) : null}
      <p className="auth-page__foot">
        New here? <Link href="/auth/register">Create an account</Link>
      </p>
    </main>
  )
}
