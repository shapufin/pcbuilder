import { getPayloadClient } from '@/lib/shop'
import type { ReviewsShowcaseBlock as ReviewsShowcaseBlockType } from '@/payload-types'

type ReviewDoc = {
  id: string | number
  authorName: string
  rating: number
  title: string
  comment: string
  verifiedPurchase?: boolean | null
  createdAt?: string | null
}

const renderStars = (rating: number): string => {
  const full = '★'.repeat(Math.max(1, Math.min(5, Math.round(rating))))
  const empty = '☆'.repeat(Math.max(0, 5 - Math.round(rating)))
  return `${full}${empty}`
}

export async function ReviewsShowcase({ block }: { block: Partial<ReviewsShowcaseBlockType> }) {
  const payload = await getPayloadClient()
  const limit = typeof block.limit === 'number' && block.limit > 0 ? block.limit : 6

  let reviews: ReviewDoc[] = []
  if (Array.isArray(block.featuredReviews) && block.featuredReviews.length > 0) {
    reviews = block.featuredReviews
      .map((r) => (typeof r === 'object' && r !== null ? (r as ReviewDoc) : null))
      .filter((r): r is ReviewDoc => r !== null)
  }

  if (reviews.length === 0) {
    try {
      const res = await payload.find({
        collection: 'reviews' as never,
        where: { status: { equals: 'approved' } },
        limit,
        sort: '-rating',
      })
      reviews = (res.docs as unknown as ReviewDoc[]) ?? []
    } catch {
      reviews = []
    }
  }

  if (reviews.length === 0) return null

  return (
    <section className="blk">
      {block.eyebrow && <p className="blk__lead" style={{ textAlign: 'center', marginBottom: 'var(--space-1)' }}>{block.eyebrow}</p>}
      {block.heading && <h2 className="blk__title blk--center">{block.heading}</h2>}
      <div className="blk-reviews-grid">
        {reviews.map((r) => (
          <div key={r.id} className="blk-review-card">
            <span className="blk-review-card__stars" aria-label={`${r.rating} out of 5 stars`}>
              {renderStars(r.rating)}
            </span>
            <h3 className="blk-review-card__title">{r.title}</h3>
            <p className="blk-review-card__comment">{r.comment}</p>
            <div className="blk-review-card__footer">
              <span className="blk-review-card__author">{r.authorName}</span>
              {r.verifiedPurchase && (
                <span className="blk-review-card__verified">
                  <span aria-hidden="true">✓</span> Verified Buyer
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
