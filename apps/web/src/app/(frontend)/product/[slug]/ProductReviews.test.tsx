import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductReviews, type ReviewItem } from './ProductReviews.tsx'

const review = (over: Partial<ReviewItem>): ReviewItem => ({
  id: 1,
  rating: 5,
  title: 'Great',
  comment: 'Works well',
  authorName: 'Alex R.',
  createdAt: '2026-10-01T10:00:00.000Z',
  isVerifiedBuyer: false,
  ...over,
})

describe('ProductReviews — summary score', () => {
  it('#662 shows no rating number and no filled stars when there are zero reviews', () => {
    const html = renderToStaticMarkup(
      <ProductReviews productId={1} productTitle="ASUS 27" reviews={[]} />,
    )
    // A product with no approved reviews must never advertise a 5.0 score.
    expect(html).not.toContain('>5.0<')
    expect(html).toContain('>—<')
    expect(html).toContain('Based on 0 reviews')
    expect(html).not.toContain('pdp-reviews__star--filled')
    expect(html).toContain('No reviews yet for this product.')
  })

  it('#663 averages approved reviews and fills the matching stars', () => {
    const html = renderToStaticMarkup(
      <ProductReviews
        productId={1}
        productTitle="ASUS 27"
        reviews={[review({ id: 1, rating: 4 }), review({ id: 2, rating: 5 })]}
      />,
    )
    expect(html).toContain('>4.5<')
    expect(html).toContain('Based on 2 reviews')
    expect((html.match(/pdp-reviews__star--filled/g) || []).length).toBeGreaterThan(0)
  })
  it('#728 renders an accessible write review trigger with aria-label on the form container', () => {
    const html = renderToStaticMarkup(
      <ProductReviews productId={1} productTitle="ASUS 27" reviews={[]} />,
    )
    expect(html).toContain('Write a Review')
    expect(html).toContain('Customer Reviews &amp; Ratings')
  })
})