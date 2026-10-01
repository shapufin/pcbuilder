'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { sanitizeNext } from '@/lib/auth'

const input: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 15,
}

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
    <main style={{ maxWidth: 460, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>Sign in</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 24px' }}>
        Access your orders and saved builds.
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
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--color-border-strong)' }}>
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={input}
          />
          <Link
            href="/auth/forgot"
            style={{
              color: 'var(--color-primary-hover)',
              fontSize: 13,
              justifySelf: 'end',
              marginTop: -2,
            }}
          >
            Forgot password?
          </Link>
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '12px 22px',
            borderRadius: 10,
            border: 0,
            background: 'var(--color-primary-strong)',
            color: 'var(--color-on-primary)',
            fontWeight: 700,
            fontSize: 15,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 14 }}>
          {error}
        </p>
      ) : null}
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 24 }}>
        New here?{' '}
        <Link href="/auth/register" style={{ color: 'var(--color-primary-hover)' }}>
          Create an account
        </Link>
      </p>
    </main>
  )
}
