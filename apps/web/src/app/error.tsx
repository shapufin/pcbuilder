'use client'

import Link from 'next/link'

// App-level error boundary (09-routes.md). No Sentry wiring — the DSN is a
// parked owner item; without it the boundary degrades to retry + navigation.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Something went wrong</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
        An unexpected error occurred. You can retry or head back to the homepage.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn--primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn" style={{ textDecoration: 'none' }}>
          Back to homepage
        </Link>
      </div>
    </main>
  )
}
