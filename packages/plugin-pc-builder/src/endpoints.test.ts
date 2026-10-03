import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import {
  builderClaimBuildEndpoint,
  builderConflictsEndpoint,
  builderRulesImportEndpoint,
  builderSaveBuildEndpoint,
  builderShareBuildEndpoint,
  builderUseTemplateEndpoint,
} from './endpoints.ts'
import { invalidateBuilderIndex } from './lib/builder-index.ts'

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
    update: vi.fn(async ({ id, data }: { id: string | number; data: Doc }) => {
      const doc = [...existing, ...created].find((d) => d.id === id)
      if (!doc) throw new Error('not found')
      Object.assign(doc, data)
      return doc
    }),
  }
}

const makeReq = (
  body: unknown,
  payload: ReturnType<typeof makePayload> | Record<string, unknown>,
  roles = ['admin'],
  routeParams?: Record<string, string>,
  query?: Record<string, unknown>,
): PayloadRequest =>
  ({
    user: roles.length ? { id: 7, roles, collection: 'users' } : null,
    json: async () => body,
    payload,
    routeParams,
    query,
    headers: new Headers(),
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

const claim = (body: unknown, payload: ReturnType<typeof makePayload>, roles = ['customer']) =>
  builderClaimBuildEndpoint.handler!(makeReq(body, payload, roles))

describe('claim endpoint — entry 15 (anonymous save -> account)', () => {
  it('#85 anonymous -> 401; invalid body -> 400; unknown shareId -> 404', async () => {
    const payload = makePayload()
    expect((await claim({ shareId: 'ghost' }, payload, [])).status).toBe(401)
    expect((await claim({}, payload)).status).toBe(400)
    expect((await claim({ shareId: 'ghost' }, payload)).status).toBe(404)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('#86 ownership: guest build claimable; foreign build -> 403; own build -> idempotent 200', async () => {
    const guest = { id: 55, user: null, shareId: 'guest-share', name: 'Anonymous build' }
    const foreign = { id: 60, user: { id: 999, collection: 'users' }, shareId: 'his-share' }
    const own = { id: 61, user: 7, shareId: 'my-share' }
    const payload = makePayload([guest, foreign, own])

    const res = await claim({ shareId: 'guest-share' }, payload)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 55, claimed: true })
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'configured-builds',
        id: 55,
        data: { user: 7 },
      }),
    )
    expect(guest.user).toBe(7)

    expect((await claim({ shareId: 'his-share' }, payload)).status).toBe(403)
    const mine = await claim({ shareId: 'my-share' }, payload)
    expect(mine.status).toBe(200)
    expect(await mine.json()).toMatchObject({ id: 61, claimed: false, alreadyClaimed: true })
    expect(payload.update).toHaveBeenCalledTimes(1)
  })
})

/** Entry 15 live probes: use-template created price-0 builds with 8 EMPTY slots —
 *  the endpoint read `slot.components` (configured-builds shape) but build-templates
 *  store a singular `component` relationship. */
const templatePayload = (template: Doc | null) => {
  const created: Doc[] = []
  const collections: Record<string, Doc[]> = {
    'component-categories': [
      { id: 4, slug: 'os', name: 'Operating System', required: true, maxSelectable: 1, sortOrder: 0 },
    ],
    components: [
      {
        id: 31,
        name: 'Microsoft Windows 11 Home',
        category: { id: 4 },
        productVariant: { id: 90, priceInEUR: 11900 },
      },
    ],
    'compatibility-rules': [],
    'derived-power-rules': [],
  }
  return {
    created,
    find: vi.fn(async ({ collection }: { collection: string }) => ({ docs: collections[collection] ?? [] })),
    findByID: vi.fn(async () => template),
    update: vi.fn(async ({ id, data }: { id: string | number; data: Doc }) => ({ id, ...data })),
    create: vi.fn(async ({ data }: { data: Doc }) => {
      const doc = { id: 100, ...data }
      created.push(doc)
      return doc
    }),
  }
}

const useTemplate = (payload: ReturnType<typeof templatePayload>, id: string) =>
  builderUseTemplateEndpoint.handler!(makeReq({}, payload, ['customer'], { id }))

describe('use template endpoint — entry 15 (live probe regressions)', () => {
  it('#91 singular component slots (build-templates shape) become real build slots', async () => {
    const payload = templatePayload({
      id: 1,
      name: 'Vanguard',
      popularity: 0,
      slots: [{ category: { id: 4 }, component: { id: 31 } }],
    })
    const res = await useTemplate(payload, '1')
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.shareId).toBeTruthy()
    expect(payload.created[0].slots).toEqual([{ category: 4, components: [31] }])
    expect(payload.created[0].priceSnapshot).toBe(11900)
  })

  it('#92 template with no usable components -> 400, no build, no popularity bump', async () => {
    const payload = templatePayload({
      id: 2,
      name: 'Hollow',
      popularity: 0,
      slots: [{ category: { id: 4 }, component: null }],
    })
    const res = await useTemplate(payload, '2')
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('no components') })
    expect(payload.created).toHaveLength(0)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('#194 a template whose slots fail validation does NOT bump popularity (422 first)', async () => {
    const payload = templatePayload({
      id: 3,
      name: 'Broken',
      popularity: 0,
      slots: [{ category: { id: 4 }, component: { id: 999 } }], // unknown component
    })
    const res = await useTemplate(payload, '3')
    expect(res.status).toBe(422)
    expect(payload.created).toHaveLength(0)
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('save endpoint — audit pass 3 (required/maxSelectable enforced server-side)', () => {
  const save = (body: unknown, payload: ReturnType<typeof templatePayload>) =>
    builderSaveBuildEndpoint.handler!(makeReq(body, payload, ['customer']))

  it('#195 unknown refs still -> 422 with reasons (slug + id forms)', async () => {
    invalidateBuilderIndex()
    const payload = templatePayload(null)
    const res2 = await save({ slots: [{ categoryId: 'os', componentIds: ['999'] }] }, payload)
    expect(res2.status).toBe(422) // unknown component
    expect(payload.created).toHaveLength(0)

    const res3 = await save(
      { slots: [{ categoryId: 'os', componentIds: ['31'] }, { categoryId: '99', componentIds: ['31'] }] },
      payload,
    )
    expect(res3.status).toBe(422) // '99' is not a category in the fixture
    expect(payload.created).toHaveLength(0)
  })

  it('#196 a build missing a REQUIRED category is refused at save', async () => {
    invalidateBuilderIndex()
    // two required categories; only one filled
    const payload = templatePayload(null)
    payload.find.mockImplementation(async ({ collection }: { collection: string }) => ({
      docs:
        collection === 'component-categories'
          ? [
              { id: 4, slug: 'os', name: 'Operating System', required: true, maxSelectable: 1, sortOrder: 0 },
              { id: 5, slug: 'cpu', name: 'CPU', required: true, maxSelectable: 1, sortOrder: 1 },
            ]
          : collection === 'components'
            ? [{ id: 31, name: 'Windows 11', category: { id: 4 }, productVariant: { id: 90, priceInEUR: 11900 } }]
            : [],
    }))
    const res = await save({ slots: [{ categoryId: '4', componentIds: ['31'] }] }, payload)
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ error: 'build is incomplete' })
    expect(payload.created).toHaveLength(0)
  })
})

describe('save endpoint — entry 50 (rgbColor passthrough + over-cap warnings)', () => {
  const save = (body: unknown, payload: { find: unknown; create: unknown; update: unknown }) =>
    builderSaveBuildEndpoint.handler!(makeReq(body, payload as ReturnType<typeof makePayload>, ['customer']))

  const slotCapPayload = () => {
    const created: Doc[] = []
    const collections: Record<string, Doc[]> = {
      'component-categories': [
        { id: 1, slug: 'motherboard', name: 'Motherboard', required: true, maxSelectable: 1, sortOrder: 0 },
        { id: 2, slug: 'ram', name: 'Memory', required: true, maxSelectable: 4, sortOrder: 1 },
      ],
      components: [
        { id: 11, name: 'ITX Board', category: { id: 1 }, ramSlots: 2, productVariant: { id: 90, priceInEUR: 10000 } },
        { id: 21, name: 'DIMM A', category: { id: 2 }, productVariant: { id: 91, priceInEUR: 5000 } },
        { id: 22, name: 'DIMM B', category: { id: 2 }, productVariant: { id: 92, priceInEUR: 5000 } },
        { id: 23, name: 'DIMM C', category: { id: 2 }, productVariant: { id: 93, priceInEUR: 5000 } },
      ],
      'compatibility-rules': [],
      'derived-power-rules': [],
    }
    return {
      created,
      find: vi.fn(async ({ collection }: { collection: string }) => ({ docs: collections[collection] ?? [] })),
      create: vi.fn(async ({ data }: { data: Doc }) => {
        const doc = { id: 100, ...data }
        created.push(doc)
        return doc
      }),
      update: vi.fn(async ({ id, data }: { id: string | number; data: Doc }) => ({ id, ...data })),
    }
  }

  it('#307 a valid rgbColor persists on the created build and response', async () => {
    invalidateBuilderIndex()
    const payload = templatePayload(null)
    const res = await save(
      { slots: [{ categoryId: 'os', componentIds: ['31'] }], rgbColor: '#7df4ff' },
      payload,
    )
    expect(res.status).toBe(200)
    expect(payload.created[0].rgbColor).toBe('#7df4ff')
    expect(await res.json()).toMatchObject({ rgbColor: '#7df4ff' })
  })

  it('#308 a non-hex rgbColor is rejected at the schema boundary', async () => {
    invalidateBuilderIndex()
    const payload = templatePayload(null)
    const res = await save(
      { slots: [{ categoryId: 'os', componentIds: ['31'] }], rgbColor: 'notacolor' },
      payload,
    )
    expect(res.status).toBe(400)
    expect(payload.created).toHaveLength(0)
  })

  it('#309 over-cap selections save with a non-blocking validationSnapshot warning', async () => {
    invalidateBuilderIndex()
    const payload = slotCapPayload()
    const res = await save(
      {
        slots: [
          { categoryId: '1', componentIds: ['11'] },
          { categoryId: '2', componentIds: ['21', '22', '23'] },
        ],
      },
      payload,
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    const warnings = (data.validationSnapshot?.warnings ?? []) as { message?: string }[]
    expect(warnings.some((w) => /2.*ramSlots|ramSlots/i.test(String(w.message)))).toBe(true)
  })

  it('#312 share endpoint returns the saved rgbColor', async () => {
    const payload = {
      find: vi.fn(async () => ({
        docs: [{ id: 9, name: 'RGB rig', shareId: 's1', rgbColor: '#fb923c', slots: [] }],
      })),
    }
    const res = await builderShareBuildEndpoint.handler!(
      makeReq(null, payload as unknown as ReturnType<typeof makePayload>, ['customer'], {
        shareId: 's1',
      }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).rgbColor).toBe('#fb923c')
  })

  it('#316 duplicate categoryId slots cannot evade maxSelectable (counts are summed)', async () => {
    invalidateBuilderIndex()
    const payload = templatePayload(null)
    // 'os' has maxSelectable 1 — two separate rows of 1 component each must
    // still be refused (per-row checks would see each within the limit).
    const res = await save(
      {
        slots: [
          { categoryId: 'os', componentIds: ['31'] },
          { categoryId: 'os', componentIds: ['31'] },
        ],
      },
      payload,
    )
    expect(res.status).toBe(422)
    expect(payload.created).toHaveLength(0)
  })
})

describe('conflicts endpoint — audit pass 3 (staff-gated per 08-api-surface)', () => {
  const conflicts = (payload: Record<string, unknown>, roles: string[]) =>
    builderConflictsEndpoint.handler!(
      makeReq(null, payload, roles, undefined, { componentId: '31' }),
    )

  it('#197 anonymous and customer callers get 401; staff pass through to evaluation', async () => {
    const payload = {
      find: vi.fn(async () => ({ docs: [] })),
      logger: { error: vi.fn() },
    }
    expect((await conflicts(payload, [])).status).toBe(401)
    expect((await conflicts(payload, ['customer'])).status).toBe(401)
    const staff = await conflicts(payload, ['staff'])
    expect(staff.status).toBe(200)
  })
})
