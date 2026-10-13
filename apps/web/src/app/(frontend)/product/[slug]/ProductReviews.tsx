'use client'

import React, { useState } from 'react'

export interface ReviewItem {
  id: number | string
  rating: number
  title: string
  comment: string
  authorName: string
  isVerifiedBuyer?: boolean
  createdAt: string
}

interface ProductReviewsProps {
  productId: number
  productTitle: string
  reviews: ReviewItem[]
}

export function ProductReviews({ productId, productTitle, reviews }: ProductReviewsProps) {
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  const count = reviews.length
  const avgRating = count > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / count).toFixed(1) : '5.0'

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.forEach((r) => {
    if (ratingCounts[r.rating] !== undefined) ratingCounts[r.rating]++
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          title,
          comment,
          authorName,
          authorEmail,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSubmitStatus({
          success: true,
          message: data.message || 'Thank you! Your review has been submitted for moderation.',
        })
        setTitle('')
        setComment('')
        setAuthorName('')
        setAuthorEmail('')
        setTimeout(() => setShowForm(false), 3000)
      } else {
        setSubmitStatus({
          success: false,
          message: data.error || 'Failed to submit review. Please check all fields.',
        })
      }
    } catch {
      setSubmitStatus({
        success: false,
        message: 'Network error. Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="pdp-reviews" id="reviews" aria-labelledby="pdp-reviews-heading">
      <div className="pdp-reviews__header">
        <div>
          <h2 id="pdp-reviews-heading" className="pdp-reviews__title">
            Customer Reviews & Ratings
          </h2>
          <p className="pdp-reviews__subtitle">
            Real feedback from verified rig builders and PC gamers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="btn btn--secondary pdp-reviews__write-btn"
        >
          {showForm ? 'Cancel Review' : '★ Write a Review'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="pdp-reviews__form" aria-label="Write a review">
          <h3 className="pdp-reviews__form-title">Reviewing: {productTitle}</h3>

          <div className="pdp-reviews__form-group">
            <label className="pdp-reviews__label">Rating Score</label>
            <div className="pdp-reviews__star-picker" role="radiogroup" aria-label="Star Rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} Star${star > 1 ? 's' : ''}`}
                  className={`pdp-reviews__star-btn ${
                    (hoverRating || rating) >= star ? 'pdp-reviews__star-btn--active' : ''
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  ★
                </button>
              ))}
              <span className="pdp-reviews__star-label">
                {rating === 5
                  ? '5 Stars — Excellent'
                  : rating === 4
                  ? '4 Stars — Very Good'
                  : rating === 3
                  ? '3 Stars — Average'
                  : rating === 2
                  ? '2 Stars — Poor'
                  : '1 Star — Terrible'}
              </span>
            </div>
          </div>

          <div className="pdp-reviews__form-row">
            <div className="pdp-reviews__form-group">
              <label htmlFor="review-author-name" className="pdp-reviews__label">
                Your Name / Handle
              </label>
              <input
                id="review-author-name"
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Alex R."
                className="pdp-reviews__input"
              />
            </div>
            <div className="pdp-reviews__form-group">
              <label htmlFor="review-author-email" className="pdp-reviews__label">
                Email Address (Kept Private)
              </label>
              <input
                id="review-author-email"
                type="email"
                required
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="alex@example.com"
                className="pdp-reviews__input"
              />
            </div>
          </div>

          <div className="pdp-reviews__form-group">
            <label htmlFor="review-headline" className="pdp-reviews__label">
              Review Headline
            </label>
            <input
              id="review-headline"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Insane performance, whisper quiet cooling!"
              className="pdp-reviews__input"
            />
          </div>

          <div className="pdp-reviews__form-group">
            <label htmlFor="review-comment" className="pdp-reviews__label">
              Detailed Experience
            </label>
            <textarea
              id="review-comment"
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share how this hardware performs in your setup, temperatures, FPS gains..."
              className="pdp-reviews__textarea"
            />
          </div>

          {submitStatus && (
            <div
              className={`pdp-reviews__message ${
                submitStatus.success ? 'pdp-reviews__message--success' : 'pdp-reviews__message--error'
              }`}
            >
              {submitStatus.message}
            </div>
          )}

          <div className="pdp-reviews__form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn--primary pdp-reviews__submit-btn"
            >
              {isSubmitting ? 'Submitting Review...' : 'Submit Review for Moderation'}
            </button>
          </div>
        </form>
      )}

      <div className="pdp-reviews__summary-card">
        <div className="pdp-reviews__score-box">
          <span className="pdp-reviews__big-score">{avgRating}</span>
          <div className="pdp-reviews__stars-row">
            {'★★★★★'.split('').map((s, i) => (
              <span
                key={i}
                className={i < Math.round(Number(avgRating)) ? 'pdp-reviews__star--filled' : 'pdp-reviews__star--empty'}
              >
                ★
              </span>
            ))}
          </div>
          <span className="pdp-reviews__count">Based on {count} review{count === 1 ? '' : 's'}</span>
        </div>

        <div className="pdp-reviews__bars">
          {[5, 4, 3, 2, 1].map((s) => {
            const cnt = ratingCounts[s] || 0
            const pct = count > 0 ? Math.round((cnt / count) * 100) : 0
            return (
              <div key={s} className="pdp-reviews__bar-row">
                <span className="pdp-reviews__bar-label">{s} ★</span>
                <div className="pdp-reviews__bar-track">
                  <div className="pdp-reviews__bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="pdp-reviews__bar-val">{cnt}</span>
              </div>
            )
          })}
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="pdp-reviews__empty">
          <p>No reviews yet for this product. Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="pdp-reviews__list">
          {reviews.map((r) => (
            <article key={r.id} className="pdp-reviews__item">
              <div className="pdp-reviews__item-meta">
                <div className="pdp-reviews__item-author-wrap">
                  <span className="pdp-reviews__item-avatar">{r.authorName.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <span className="pdp-reviews__item-author">{r.authorName}</span>
                    {r.isVerifiedBuyer ? (
                      <span className="pdp-reviews__verified-badge">
                        ✓ Verified Buyer
                      </span>
                    ) : null}
                  </div>
                </div>
                <time className="pdp-reviews__item-date">
                  {new Date(r.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </div>

              <div className="pdp-reviews__item-stars">
                {[1, 2, 3, 4, 5].map((st) => (
                  <span
                    key={st}
                    className={st <= r.rating ? 'pdp-reviews__star--filled' : 'pdp-reviews__star--empty'}
                  >
                    ★
                  </span>
                ))}
              </div>

              <h4 className="pdp-reviews__item-title">{r.title}</h4>
              <p className="pdp-reviews__item-comment">{r.comment}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
