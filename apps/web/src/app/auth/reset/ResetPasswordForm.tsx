'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'

const input: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 15,
}

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
      <main style={{ maxWidth: 460, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>Reset link incomplete</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 24px' }}>
          This page needs the reset link from your email.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          <Link href="/auth/forgot" style={{ color: 'var(--color-primary-hover)' }}>
            Request a new link
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 460, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>Set a new password</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 24px' }}>
        The link expires 1 hour after it was requested and can be used once.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--color-border-strong)' }}>
          New password
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
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--color-border-strong)' }}>
          Confirm password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat the password"
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
            background: 'var(--color-primary-strong)',
            color: 'var(--color-on-primary)',
            fontWeight: 700,
            fontSize: 15,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? 'Saving…' : 'Set password'}
        </button>
      </form>
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 14 }}>
          {error}
        </p>
      ) : null}
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 24 }}>
        <Link href="/auth/login" style={{ color: 'var(--color-primary-hover)' }}>
          Back to sign in
        </Link>
      </p>
    </main>
  )
}
