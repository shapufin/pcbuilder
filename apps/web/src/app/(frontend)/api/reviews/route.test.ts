import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PATCH, POST } from './route'

vi.mock('@/lib/shop', () => ({
  getPayloadClient: vi.fn(),
}))

// Payload REST handlers shadowed by this explicit route — the route delegates
// non-POST methods (and authenticated POSTs) so the reviews collection REST
// API stays reachable for the admin console.
const { mockRestGet, mockRestPost, mockRestPatch } = vi.hoisted(() => ({
  mockRestGet: vi.fn(async () => Response.json({ docs: [], totalDocs: 0 })),
  mockRestPost: vi.fn(async () => Response.json({ doc: { id: 9 } }, { status: 201 })),
  mockRestPatch: vi.fn(async () => Response.json({ doc: { id: 9 } })),
}))
vi.mock('@payloadcms/next/routes', () => ({
  REST_GET: () => mockRestGet,
  REST_POST: () => mockRestPost,
  REST_PATCH: () => mockRestPatch,
  REST_DELETE: () => vi.fn(async () => Response.json({})),
  REST_PUT: () => vi.fn(async () => Response.json({})),
  REST_OPTIONS: () => vi.fn(async () => new Response(null, { status: 200 })),
}))
vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

import { getPayloadClient } from '@/lib/shop'

const makeReq = (body: unknown, ip: string, origin = 'http://localhost:3000'): Parameters<typeof POST>[0] =>
  new Request('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      origin,
    },
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0]

describe('reviews API route', () => {
  const mockFindByDoc = vi.fn()
  const mockFind = vi.fn()
  const mockCreate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPayloadClient).mockResolvedValue({
      findByID: mockFindByDoc,
      find: mockFind,
      create: mockCreate,
    } as never)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects forbidden origin', async () => {
    const res = await POST(
      makeReq(
        { productId: 1, rating: 5, title: 'Great', comment: 'Loved it', authorName: 'Sam', authorEmail: 'sam@example.com' },
        '10.8.1.1',
        'http://malicious-site.com',
      ),
    )
    expect(res.status).toBe(403)
  })

  it('validates required fields and star rating bounds', async () => {
    const invalidRes = await POST(
      makeReq(
        { productId: 1, rating: 6, title: '', comment: 'short', authorName: '', authorEmail: 'not-an-email' },
        '10.8.1.2',
      ),
    )
    expect(invalidRes.status).toBe(400)
    const json = await invalidRes.json()
    expect(json.error).toBe('Invalid review payload')
  })

  it('submits a valid review in pending status', async () => {
    mockFindByDoc.mockResolvedValue({ id: 42, title: 'RTX 4090' })
    mockFind.mockResolvedValue({ docs: [] }) // not a verified buyer
    mockCreate.mockResolvedValue({ id: 101, status: 'pending' })

    const res = await POST(
      makeReq(
        {
          productId: 42,
          rating: 5,
          title: 'Unbelievable frame rates!',
          comment: 'Playing Cyberpunk 2077 at 4K max ray tracing silky smooth.',
          authorName: 'Alex Tech',
          authorEmail: 'alex@example.com',
        },
        '10.8.1.3',
      ),
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.id).toBe(101)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'reviews',
        data: expect.objectContaining({
          product: 42,
          rating: 5,
          status: 'pending',
          verifiedPurchase: false,
        }),
      }),
    )
  })

  it('marks verifiedPurchase if completed order matches product', async () => {
    mockFindByDoc.mockResolvedValue({ id: 42, title: 'RTX 4090' })
    mockFind.mockResolvedValue({
      docs: [
        {
          id: 501,
          items: [{ product: 42 }],
        },
      ],
    })
    mockCreate.mockResolvedValue({ id: 102, status: 'pending' })

    const res = await POST(
      makeReq(
        {
          productId: 42,
          rating: 5,
          title: 'Verified rig component',
          comment: 'Arrived packaged in heavy foam. Runs perfectly.',
          authorName: 'Verified Alex',
          authorEmail: 'alex.buyer@example.com',
        },
        '10.8.1.4',
      ),
    )

    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verifiedPurchase: true,
        }),
      }),
    )
  })

  it('delegates GET to Payload REST (collection list stays reachable)', async () => {
    const res = await GET(new Request('http://localhost:3000/api/reviews?limit=10') as never)
    expect(mockRestGet).toHaveBeenCalled()
    expect(res.status).toBe(200)
    expect((await res.json()).totalDocs).toBe(0)
  })

  it('delegates PATCH to Payload REST (admin moderation updates)', async () => {
    const res = await PATCH(
      new Request('http://localhost:3000/api/reviews', { method: 'PATCH' }) as never,
    )
    expect(mockRestPatch).toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('routes authenticated POSTs (admin cookie) to Payload REST create', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: 'payload-token=abc' },
        body: JSON.stringify({ title: 'x' }),
      }) as never,
    )
    expect(mockRestPost).toHaveBeenCalled()
    expect(res.status).toBe(201)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('keeps anonymous POSTs on the public submission pipeline', async () => {
    const res = await POST(makeReq({ productId: 1 }, '10.9.9.9'))
    expect(mockRestPost).not.toHaveBeenCalled()
    expect(res.status).toBe(400) // schema validation still applies
  })
})
