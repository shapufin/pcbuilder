'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import { sanitizeNext } from '@/lib/auth'

const input: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#f8fafc',
  fontSize: 15,
}

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
    <main style={{ maxWidth: 460, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>Create account</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px' }}>
        Save builds, track orders and check out faster.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: '#cbd5e1' }}>
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
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: '#cbd5e1' }}>
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            style={input}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '12px 22px',
            borderRadius: 10,
            border: 0,
            background: '#6366f1',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      {error ? (
        <p role="alert" style={{ color: '#f87171', fontSize: 14, marginTop: 14 }}>
          {error}
        </p>
      ) : null}
      <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 24 }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: '#818cf8' }}>
          Sign in
        </Link>
      </p>
    </main>
  )
}
