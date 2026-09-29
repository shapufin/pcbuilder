import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/shop'
import { LogoutButton } from './LogoutButton'

export const metadata: Metadata = { title: 'My account | BuildMyRig' }

const eur = (cents: number): string => `€${(cents / 100).toFixed(2)}`

const statusColor = (status: string | null | undefined): string =>
  status === 'completed' ? '#34d399' : status === 'processing' ? '#fbbf24' : '#94a3b8'

const cell: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #1e293b',
  textAlign: 'left',
  fontSize: 14,
}

export default async function AccountPage() {
  const payload = await getPayloadClient()
  // Authoritative check: proxy.ts only tests cookie presence; the token may
  // still be expired/invalid. Queries are scoped to this verified session id
  // (no client-supplied ids → no IDOR surface).
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/auth/login?next=%2Faccount')

  const [orders, builds] = await Promise.all([
    payload.find({
      collection: 'orders',
      where: {
        or: [
          { customer: { equals: user.id } },
          { customerEmail: { equals: user.email } },
        ],
      },
      sort: '-createdAt',
      limit: 20,
    }),
    payload.find({
      collection: 'configured-builds',
      where: { user: { equals: user.id } },
      sort: '-createdAt',
      limit: 20,
      depth: 0,
    }),
  ])

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>My account</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 14px' }}>Orders</h2>
        {orders.docs.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            No orders yet —{' '}
            <Link href="/shop" style={{ color: '#818cf8' }}>
              browse the shop
            </Link>
            .
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...cell, color: '#64748b', fontWeight: 600 }}>Order</th>
                  <th style={{ ...cell, color: '#64748b', fontWeight: 600 }}>Date</th>
                  <th style={{ ...cell, color: '#64748b', fontWeight: 600 }}>Total</th>
                  <th style={{ ...cell, color: '#64748b', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.docs.map((order) => (
                  <tr key={order.id}>
                    <td style={cell}>#{order.id}</td>
                    <td style={{ ...cell, color: '#94a3b8' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={cell}>
                      {eur(order.amount ?? 0)} {order.currency ?? 'EUR'}
                    </td>
                    <td style={{ ...cell, color: statusColor(order.status) }}>
                      {order.status ?? 'pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 14px' }}>Saved builds</h2>
        {builds.docs.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            Nothing saved yet —{' '}
            <Link href="/builder" style={{ color: '#818cf8' }}>
              configure a PC
            </Link>{' '}
            and hit &ldquo;Save build&rdquo;.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {builds.docs.map((build) => (
              <li
                key={build.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  background: '#0f172a',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{build.name}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    {eur(build.priceSnapshot ?? 0)} · saved{' '}
                    {new Date(build.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
                {build.shareId ? (
                  <Link href={`/build/${build.shareId}`} style={{ color: '#818cf8', fontSize: 14 }}>
                    View build
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
