import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/shop'
import { formatEUR } from '@/components/ui/Price'
import '../../builder/builder.css'

export const metadata: Metadata = {
  title: 'Shared build | BuildMyRig',
  // Public capability links — never indexed (09-routes: share pages noindex).
  robots: { index: false, follow: false },
}

// Share pages render live snapshots (price/warnings re-read on every request)
// and must not pin a cached 404 for a freshly-created shareId.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ shareId: string }> }

export default async function SharedBuildPage({ params }: Props) {
  const { shareId } = await params
  const payload = await getPayloadClient()

  const build = (
    await payload.find({
      collection: 'configured-builds',
      where: { shareId: { equals: shareId } },
      limit: 1,
      depth: 2,
      overrideAccess: true,
    })
  ).docs[0] as
    | {
        id: string | number
        name: string
        priceSnapshot?: number | null
        validationSnapshot?: { warnings?: { message?: string }[] } | null
        slots?: {
          category?: { id: string | number; name?: string } | string | number
          components?: ({ id: string | number; name?: string } | string | number)[]
        }[]
      }
    | undefined
  if (!build) notFound()

  const slots = (build.slots ?? []).map((slot) => ({
    categoryName:
      slot.category && typeof slot.category === 'object' && 'name' in slot.category
        ? slot.category.name
        : 'Slot',
    components: (slot.components ?? []).map((c) =>
      c && typeof c === 'object' && 'name' in c ? c.name : 'Part',
    ),
  }))

  return (
    <main className="builder-page summary">
      <header className="summary__head">
        <h1 className="summary__title">{build.name}</h1>
        <span className="tag">shared build</span>
        <Link href={`/builder/configure?build=${shareId}`} className="btn btn--primary">
          Duplicate this build
        </Link>
      </header>

      <div className="panel">
        <table className="summary-table">
          <thead>
            <tr>
              <th scope="col">Slot</th>
              <th scope="col">Part</th>
            </tr>
          </thead>
          <tbody>
            {slots.flatMap((slot) =>
              slot.components.map((name, i) => (
                <tr key={`${slot.categoryName}-${name}-${i}`}>
                  <td>{i === 0 ? slot.categoryName : ''}</td>
                  <td>{name}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>

        <div className="rail-price">
          <span className="muted">Components total (snapshot)</span>
          <span className="amount">{formatEUR(build.priceSnapshot ?? 0)}</span>
        </div>

        {(build.validationSnapshot?.warnings?.length ?? 0) > 0 && (
          <div className="warnings">
            {build.validationSnapshot!.warnings!.map((w, i) => (
              <div key={i} className="warning-item">
                {w.message}
              </div>
            ))}
          </div>
        )}

        <p className="state-msg">
          Prices and compatibility are re-validated on the server before checkout.
        </p>
      </div>
    </main>
  )
}
