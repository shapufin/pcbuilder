import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/shop'
import { formatEUR } from '@/components/ui/Price'
import { LogoutButton } from './LogoutButton'
import '../shop/shop.css'

export const metadata: Metadata = { title: 'My account | BuildMyRig' }

const dateFmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })

const statusBadge = (status: string | null | undefined): { label: string; cls: string } => {
  switch (status) {
    case 'completed':
      return { label: 'Completed', cls: 'badge badge--success' }
    case 'processing':
      return { label: 'Processing', cls: 'badge badge--warning' }
    case 'cancelled':
    case 'refunded':
      return { label: status, cls: 'badge badge--danger' }
    default:
      return { label: status ?? 'Pending', cls: 'badge' }
  }
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
    <main className="page">
      <div className="block-head">
        <div>
          <h1 className="page__title">My account</h1>
          <p className="page__lead">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      <section className="section-gap">
        <h2 className="page__section-title">Orders</h2>
        {orders.docs.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">No orders yet</p>
            <p className="empty-state__desc">When you buy something it shows up here with live status.</p>
            <Link href="/shop" className="btn btn--secondary btn--sm">
              Browse the shop
            </Link>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Date</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.docs.map((order) => {
                  const badge = statusBadge(order.status)
                  return (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{dateFmt.format(new Date(order.createdAt))}</td>
                      <td>
                        {formatEUR(order.amount ?? 0)} {order.currency ?? 'EUR'}
                      </td>
                      <td>
                        <span className={badge.cls}>{badge.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section-gap">
        <h2 className="page__section-title">Saved builds</h2>
        {builds.docs.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">Nothing saved yet</p>
            <p className="empty-state__desc">Configure a PC and hit &ldquo;Save build&rdquo; to keep it here.</p>
            <Link href="/builder" className="btn btn--secondary btn--sm">
              Open the builder
            </Link>
          </div>
        ) : (
          <ul className="list">
            {builds.docs.map((build) => (
              <li key={build.id} className="list-card">
                <div>
                  <div className="list-card__title">{build.name}</div>
                  <div className="list-card__meta">
                    {formatEUR(build.priceSnapshot ?? 0)} · saved {dateFmt.format(new Date(build.createdAt))}
                  </div>
                </div>
                {build.shareId ? (
                  <Link href={`/build/${build.shareId}`} className="btn btn--secondary btn--sm">
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
