import Link from 'next/link'

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(to bottom right, #020617, #0f172a, #1e1b4b)',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '768px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: 600,
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          color: '#818cf8',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          marginBottom: '1rem'
        }}>
          Payload CMS 3.x + Next.js App Router
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>
          Developer Platform Engine
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
          Your local Payload CMS environment is fully structured and prepared. Easily define collections, configure schemas, and build modern features on top of a unified TypeScript foundation.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link
            href="/admin"
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Go to Admin Dashboard &rarr;
          </Link>
        </div>
      </div>
    </main>
  )
}

