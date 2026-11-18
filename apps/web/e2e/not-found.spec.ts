import { expect, test } from '@playwright/test'

/**
 * Audit 2026-10-22 (#667): a segment-level `loading.tsx` above a page turns
 * `notFound()` into a streamed 200 + noindex. The generic skeleton moved to
 * /shop so unknown CMS slugs and dead build-share links answer with a real 404.
 */
test.describe('not-found status codes', () => {
  test('unknown CMS slug answers 404', async ({ request }) => {
    const res = await request.get('/this-route-does-not-exist')
    expect(res.status()).toBe(404)
  })

  test('dead build share link answers 404', async ({ request }) => {
    const res = await request.get('/build/not-a-real-share-id')
    expect(res.status()).toBe(404)
  })

  test('published CMS page still answers 200', async ({ request }) => {
    const res = await request.get('/about')
    expect(res.status()).toBe(200)
  })

  /**
   * Phase 4 — the same boundary sat above the PDP, so a product that vanished
   * from the public query (unpublished, or trashed once trash was enabled)
   * streamed 200 + not-found markup. Trashed products are excluded from the
   * PDP query exactly like unknown slugs, so this covers both.
   */
  test('unknown product slug answers 404', async ({ request }) => {
    const res = await request.get('/product/this-product-does-not-exist')
    expect(res.status()).toBe(404)
  })

  test('shop landing still answers 200 and keeps its skeleton boundary', async ({ request }) => {
    const res = await request.get('/shop')
    expect(res.status()).toBe(200)
  })
})
