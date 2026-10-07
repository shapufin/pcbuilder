'use client'

import Link from 'next/link'

// App-level error boundary (09-routes.md). No Sentry wiring — the DSN is a
// parked owner item; without it the boundary degrades to retry + navigation.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="status-page">
      <h1 className="status-page__title">Something went wrong</h1>
      <p className="status-page__desc">
        An unexpected error occurred. You can retry or head back to the homepage.
      </p>
      <div className="status-page__actions">
        <button type="button" className="btn btn--primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn">
          Back to homepage
        </Link>
      </div>
    </main>
  )
}
