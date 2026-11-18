import { Check, Star } from 'lucide-react'
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

const renderStars = (rating: number): React.ReactNode => {
  const full = Math.max(1, Math.min(5, Math.round(rating)))
  return (
    <span className="blk-review-card__stars" aria-label={`${full} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} aria-hidden fill={i <= full ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
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
      {block.eyebrow && <p className="blk__lead reviews-showcase-x-1">{block.eyebrow}</p>}
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
                  <Check size={12} aria-hidden /> Verified Buyer
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
