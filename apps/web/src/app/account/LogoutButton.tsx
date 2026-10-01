'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'

export function LogoutButton() {
  const router = useRouter()
  const { onLogout } = useEcommerce()
  const [busy, setBusy] = useState(false)

  const logout = async () => {
    setBusy(true)
    try {
      await fetch('/api/users/logout', { method: 'POST' })
    } catch {
      // Network hiccup: still clear local session state below.
    } finally {
      onLogout()
      router.push('/')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      style={{
        padding: '9px 18px',
        borderRadius: 10,
        border: '1px solid var(--color-border)',
        background: 'transparent',
        color: 'var(--color-border-strong)',
        fontSize: 14,
        fontWeight: 600,
        cursor: busy ? 'wait' : 'pointer',
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
