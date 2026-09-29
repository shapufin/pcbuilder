import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { builderRulesImportEndpoint } from './endpoints.ts'

/**
 * Entry 14: CSV export writes category NAMES but the import endpoint resolved
 * categories by slug only, so an export → import round-trip failed with
 * "not found". Tests #74–76 drive the real endpoint handler with a mocked
 * payload that evaluates the actual `where` clauses it issues.
 */

type Doc = Record<string, unknown>

const categories: Doc[] = [
  { id: 1, slug: 'cpu', name: 'CPU' },
  { id: 2, slug: 'motherboard', name: 'Motherboard' },
  { id: 3, slug: 'os', name: 'Operating System' },
]
const components: Doc[] = [{ id: 31, name: 'Microsoft Windows 11 Home' }]

const matches = (doc: Doc, where: Record<string, unknown> | undefined): boolean => {
  if (!where) return true
  if (Array.isArray(where.or)) return (where.or as Doc[]).some((w) => matches(doc, w))
  for (const [field, cond] of Object.entries(where)) {
    if (cond && typeof cond === 'object' && 'equals' in (cond as Doc)) {
      const expected = String((cond as { equals: unknown }).equals)
      if (String(doc[field]) !== expected) return false
    }
  }
  return true
}

const makePayload = (existing: Doc[] = []) => {
  const created: Doc[] = []
  return {
    created,
    find: vi.fn(async ({ collection, where, limit }: { collection: string; where?: Record<string, unknown>; limit?: number }) => {
      const source =
        collection === 'component-categories'
          ? categories
          : collection === 'components'
            ? components
            : existing
      const docs = source.filter((d) => matches(d, where)).slice(0, limit ?? 10)
      return { docs }
    }),
    create: vi.fn(async ({ data }: { data: Doc }) => {
      const doc = { id: 100 + created.length, ...data }
      created.push(doc)
      return doc
    }),
  }
}

const makeReq = (body: unknown, payload: ReturnType<typeof makePayload>, roles = ['admin']): PayloadRequest =>
  ({
    user: roles.length ? { roles, collection: 'users' } : null,
    json: async () => body,
    payload,
  }) as unknown as PayloadRequest

const row = (over: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  subject: 'CPU',
  subjectType: 'category',
  type: 'requires',
  operator: 'equals',
  field: 'socket',
  value: 'AM5',
  targetType: 'category',
  targetCategory: 'Motherboard',
  severity: 'error',
  message: 'test',
  ...over,
})

const call = (body: unknown, payload: ReturnType<typeof makePayload>, roles = ['admin']) =>
  builderRulesImportEndpoint.handler!(makeReq(body, payload, roles))

describe('rules import endpoint — entry 14 (name-vs-slug resolution)', () => {
  it('#74 dryRun resolves category subject/target by NAME (CSV export format) and by slug', async () => {
    const payload = makePayload()
    const res = await call({ dryRun: true, rows: [row()] }, payload)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.preview).toBe(true)
    expect(data.entries).toHaveLength(1)
    expect(data.entries[0].action).toBe('create')
    expect(data.summary).toEqual({ create: 1, skip: 0, error: 0 })

    const bySlug = await call(
      { dryRun: true, rows: [row({ subject: 'cpu', targetCategory: 'motherboard' })] },
      payload,
    )
    const slugData = await bySlug.json()
    expect(slugData.entries[0].action).toBe('create')

    const dup = await call(
      { dryRun: true, rows: [row(), row({ subject: 'cpu', targetCategory: 'motherboard' })] },
      payload,
    )
    const dupData = await dup.json()
    expect(dupData.summary).toEqual({ create: 1, skip: 1, error: 0 })

    const comp = await call(
      {
        dryRun: true,
        rows: [row({ subject: 'Microsoft Windows 11 Home', subjectType: 'component', targetCategory: 'Operating System' })],
      },
      payload,
    )
    const compData = await comp.json()
    expect(compData.entries[0].action).toBe('create')
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('#75 commit creates only resolvable non-identical rows and reports the rest', async () => {
    const existing: Doc[] = [
      {
        subjectType: 'category',
        subjectCategory: 1,
        targetType: 'category',
        targetCategory: 2,
        type: 'requires',
        operator: 'equals',
        field: 'socket',
        value: 'AM5',
        severity: 'error',
      },
    ]
    const payload = makePayload(existing)
    const res = await call(
      {
        rows: [
          row(),
          row({ subject: 'Operating System', targetCategory: 'Motherboard', type: 'excludes', field: 'gpu', value: 'rtx4090' }),
          row({ subject: 'GPU-FAKE', subjectType: 'component' }),
        ],
      },
      payload,
    )
    const data = await res.json()
    expect(data).toEqual({
      created: 1,
      skipped: 1,
      errors: ['row 3: subject "GPU-FAKE" not found'],
    })
    expect(payload.created).toHaveLength(1)
    expect(payload.created[0]).toMatchObject({
      subjectType: 'category',
      subjectCategory: 3,
      targetType: 'category',
      targetCategory: 2,
      type: 'excludes',
      enabled: true,
      bidirectional: false,
    })
  })

  it('#76 requires manager+ role (staff and anonymous are rejected)', async () => {
    const payload = makePayload()
    const staff = await call({ dryRun: true, rows: [row()] }, payload, ['staff'])
    expect(staff.status).toBe(401)
    const anon = await call({ dryRun: true, rows: [row()] }, payload, [])
    expect(anon.status).toBe(401)
    expect(payload.create).not.toHaveBeenCalled()
  })
})
