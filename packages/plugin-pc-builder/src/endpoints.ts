import type { Endpoint, JsonObject, Payload, PayloadRequest, TypeWithID } from 'payload'
import { z } from 'zod'
import { createRuleEngine, rateLimit } from '@buildmyrig/lib'
import { interpolate } from '@buildmyrig/lib'
import { buildBuilderIndex, getEngine, requireStaff } from './lib/builder-index.ts'
import {
  findUnknownSlotRefs,
  newShareId,
  priceBuildFromIndex,
  slotsToSelections,
  type BuildSlot,
} from './lib/builds.ts'

const ok = (data: unknown): Response => Response.json(data)
const bad = (status: number, message: string, extra?: unknown): Response =>
  Response.json({ error: message, ...(extra ? { details: extra } : {}) }, { status })

const conflictsSchema = z.object({ componentId: z.string().min(1) })

const importRowSchema = z.object({
  subject: z.string().min(1),
  subjectType: z.enum(['component', 'category']).default('category'),
  type: z.enum(['requires', 'excludes', 'supports', 'warns']),
  operator: z.enum(['equals', 'in', 'gte', 'lte', 'contains']),
  field: z.string().min(1),
  value: z.string().min(1),
  targetType: z.enum(['component', 'category']).default('category'),
  targetCategory: z.string().min(1),
  severity: z.enum(['error', 'warning', 'info']).default('error'),
  message: z.string().optional(),
})
const importSchema = z.object({ rows: z.array(importRowSchema).min(1).max(2000) })

export const builderIndexEndpoint: Endpoint = {
  path: '/builder/index',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      return ok(await buildBuilderIndex(req.payload))
    } catch (e) {
      req.payload.logger.error(`builder index failed: ${e instanceof Error ? e.message : e}`)
      return bad(500, 'index build failed')
    }
  },
}

export const builderConflictsEndpoint: Endpoint = {
  path: '/builder/rules/conflicts',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const parsed = conflictsSchema.safeParse(req.query)
    if (!parsed.success) return bad(400, 'componentId required', parsed.error.flatten())
    try {
      const engine = await getEngine(req.payload)
      const componentId = parsed.data.componentId
      const raw = engine.conflictsFor(componentId)
      const otherIds = [...new Set([componentId, ...raw.map(({ other }) => other.id)])]
      const nameDocs =
        otherIds.length > 0
          ? await req.payload.find({
              collection: 'components',
              where: { id: { in: otherIds } },
              limit: otherIds.length,
            })
          : { docs: [] }
      const nameOf = new Map<string, string>(
        nameDocs.docs.map((d) => [String(d.id), (d as { name?: string }).name ?? String(d.id)]),
      )
      const selfName = nameOf.get(componentId) ?? componentId
      const conflicts = raw.map(({ rule, other }) => ({
        ruleId: rule.id,
        otherId: other.id,
        otherName: nameOf.get(other.id) ?? other.id,
        rule: {
          type: rule.type,
          operator: rule.operator,
          field: rule.field,
          value: rule.value,
          severity: rule.severity,
          message: rule.message,
        },
        message: interpolate(rule.message, {
          componentA: { id: componentId, name: selfName },
          componentB: { id: other.id, name: nameOf.get(other.id) ?? other.id },
          failingSpecValue: other.specs[rule.field],
          [rule.field]: other.specs[rule.field],
        }),
      }))
      return ok({ conflicts })
    } catch (e) {
      req.payload.logger.error(`conflict evaluation failed: ${e instanceof Error ? e.message : e}`)
      return bad(500, 'conflict evaluation failed')
    }
  },
}

type ImportRow = z.infer<typeof importRowSchema>

// ---------- Phase 2e: build save / share / template-use / stock ----------

const buildsLimiter = rateLimit({ windowMs: 60_000, max: 30 })
const useTemplateLimiter = rateLimit({ windowMs: 60_000, max: 30 })

const clientIp = (req: PayloadRequest): string =>
  req.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

const rateLimited = (limiter: ReturnType<typeof rateLimit>, req: PayloadRequest): Response | null => {
  const result = limiter.check(clientIp(req))
  if (result.ok) return null
  return Response.json(
    { error: 'rate limit exceeded', retryAfterMs: result.retryAfterMs },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) } },
  )
}

const buildsSchema = z.object({
  slots: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        componentIds: z.array(z.string().min(1)).min(1).max(32),
      }),
    )
    .min(1)
    .max(64),
  name: z.string().max(120).optional(),
})

/** Category ids may arrive as numeric ids or slugs; component ids as numeric strings. */
const normalizeSlots = async (payload: Payload, slots: BuildSlot[]): Promise<BuildSlot[]> => {
  const normalized: BuildSlot[] = []
  for (const slot of slots) {
    let categoryId = slot.categoryId
    if (!/^\d+$/.test(categoryId)) {
      const cat = await payload.find({
        collection: 'component-categories',
        where: { slug: { equals: categoryId } },
        limit: 1,
      })
      if (cat.docs[0]) categoryId = String(cat.docs[0].id)
    }
    normalized.push({
      categoryId,
      componentIds: slot.componentIds.map((id) => (/^\d+$/.test(id) ? String(Number(id)) : id)),
    })
  }
  return normalized
}

const numericId = (id: string): string | number => (/^\d+$/.test(id) ? Number(id) : id)

type CreateResult = { ok: true; doc: { id: string | number; shareId: string }; body: unknown } | { ok: false; error: Response }

const createBuildFromSlots = async (
  payload: Payload,
  slots: BuildSlot[],
  name: string | undefined,
  user: PayloadRequest['user'],
): Promise<CreateResult> => {
  const index = await buildBuilderIndex(payload)
  const engine = createRuleEngine(index)
  // The engine skips unknown ids silently — catch them here so phantom refs
  // return 422 with reasons instead of a FOREIGN KEY 500 from payload.create.
  const unknown = findUnknownSlotRefs(index, slots)
  if (unknown.length > 0) {
    return {
      ok: false,
      error: Response.json(
        { error: 'build references unknown parts', reasons: unknown },
        { status: 422 },
      ),
    }
  }
  const { errors, warnings } = engine.validateSelections(slotsToSelections(slots))
  if (errors.length > 0) {
    return {
      ok: false,
      error: Response.json(
        { error: 'build is incompatible', reasons: errors.map((e) => e.message) },
        { status: 422 },
      ),
    }
  }
  const componentIds = slots.flatMap((s) => s.componentIds)
  const price = priceBuildFromIndex(index, componentIds)
  let doc: JsonObject & TypeWithID & { shareId: string }
  try {
    doc = (await payload.create({
      collection: 'configured-builds',
      data: {
        name: name?.trim() || 'Custom build',
        user: user ? user.id : null,
        shareId: newShareId(),
        slots: slots.map((s) => ({
          category: numericId(s.categoryId),
          components: s.componentIds.map(numericId),
        })),
        priceSnapshot: price,
        validationSnapshot: { errors: [], warnings, rulesVersion: index.rulesVersion },
        status: 'draft',
      } as never,
      overrideAccess: true,
    })) as JsonObject & TypeWithID & { shareId: string }
  } catch (e) {
    // Hook rejections (APIError 422) surface with their reasons; anything
    // else is unexpected and propagates as a 500.
    const status = (e as { status?: number })?.status
    if (typeof status === 'number' && status < 500 && e instanceof Error) {
      return { ok: false, error: Response.json({ error: e.message }, { status }) }
    }
    throw e
  }
  return {
    ok: true,
    doc,
    body: {
      id: doc.id,
      shareId: doc.shareId,
      priceSnapshot: price,
      validationSnapshot: { errors: [], warnings, rulesVersion: index.rulesVersion },
    },
  }
}

export const builderSaveBuildEndpoint: Endpoint = {
  path: '/builder/builds',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const limited = rateLimited(buildsLimiter, req)
    if (limited) return limited
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return bad(400, 'invalid JSON body')
    }
    const parsed = buildsSchema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid build', parsed.error.flatten())
    const slots = await normalizeSlots(req.payload, parsed.data.slots)
    const result = await createBuildFromSlots(req.payload, slots, parsed.data.name, req.user)
    if (!result.ok) return result.error
    return ok(result.body)
  },
}

export const builderShareBuildEndpoint: Endpoint = {
  path: '/builder/builds/:shareId',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const shareId = req.routeParams?.shareId
    if (!shareId) return bad(400, 'shareId required')
    const res = await req.payload.find({
      collection: 'configured-builds',
      where: { shareId: { equals: shareId } },
      limit: 1,
      overrideAccess: true,
    })
    const doc = res.docs[0] as
      | {
          id: string | number
          name: string
          priceSnapshot?: number | null
          validationSnapshot?: { warnings?: unknown[] } | null
          slots?: { category?: { id: string | number; name?: string } | string | number; components?: ({ id: string | number; name?: string } | string | number)[] }[] | null
        }
      | undefined
    if (!doc) return bad(404, 'build not found')
    const build = doc as unknown as {
      id: string | number
      name: string
      priceSnapshot?: number | null
      validationSnapshot?: { warnings?: unknown[] } | null
      slots?: { category?: { id: string | number; name?: string } | string | number; components?: { id: string | number; name?: string }[] | string[] }[] | null
    }
    return ok({
      id: build.id,
      name: build.name,
      priceSnapshot: build.priceSnapshot ?? 0,
      warnings: build.validationSnapshot?.warnings ?? [],
      slots: (build.slots ?? []).map((slot) => ({
        categoryId: String(
          slot.category && typeof slot.category === 'object' && 'id' in slot.category
            ? slot.category.id
            : slot.category,
        ),
        categoryName:
          slot.category && typeof slot.category === 'object' && 'name' in slot.category
            ? slot.category.name
            : undefined,
        componentIds: (slot.components ?? []).map((c) =>
          String(typeof c === 'object' && c && 'id' in c ? c.id : c),
        ),
        componentNames: (slot.components ?? []).map((c) =>
          typeof c === 'object' && c && 'name' in c ? c.name : undefined,
        ),
      })),
    })
  },
}

export const builderUseTemplateEndpoint: Endpoint = {
  path: '/builder/templates/:id/use',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const limited = rateLimited(useTemplateLimiter, req)
    if (limited) return limited
    const templateId = req.routeParams?.id
    if (!templateId) return bad(400, 'template id required')
    const template = await req.payload.findByID({
      collection: 'build-templates',
      id: templateId,
      overrideAccess: true,
    } as never)
    if (!template) return bad(404, 'template not found')
    await req.payload.update({
      collection: 'build-templates',
      id: template.id,
      overrideAccess: true,
      data: { popularity: ((template as { popularity?: number }).popularity ?? 0) + 1 } as never,
    })
    const slots: BuildSlot[] = (
      (template as { slots?: { category?: unknown; components?: unknown[] }[] }).slots ?? []
    ).map((slot) => ({
      categoryId:
        slot.category && typeof slot.category === 'object' && 'id' in slot.category
          ? String(slot.category.id)
          : String(slot.category),
      componentIds: (slot.components ?? [])
        .map((c) => (c && typeof c === 'object' && 'id' in c ? String(c.id) : String(c)))
        .filter(Boolean),
    }))
    const normalized = await normalizeSlots(req.payload, slots)
    const result = await createBuildFromSlots(req.payload, normalized, undefined, req.user)
    if (!result.ok) return result.error
    return ok({ buildId: result.doc.id, shareId: result.doc.shareId })
  },
}

export const builderStockAlternativesEndpoint: Endpoint = {
  path: '/builder/stock/:categoryId',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const categoryId = req.routeParams?.categoryId
    if (!categoryId) return bad(400, 'categoryId required')
    let categoryRel = categoryId
    if (!/^\d+$/.test(String(categoryId))) {
      const cat = await req.payload.find({
        collection: 'component-categories',
        where: { slug: { equals: categoryId } },
        limit: 1,
      })
      if (cat.docs[0]) categoryRel = String(cat.docs[0].id)
    }
    const excludeParam = req.query?.excludeIds
    const excludeIds = String(excludeParam ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n))
    const docs = await req.payload.find({
      collection: 'components',
      where: {
        category: { equals: categoryRel },
        ...(excludeIds.length > 0 ? { id: { not_in: excludeIds } } : {}),
      },
      limit: 5,
      depth: 1,
    })
    const alternatives = (docs.docs as unknown as {
      id: string | number
      name: string
      brand?: { name?: string } | string | number | null
      productVariant?: { priceInEUR?: number } | string | number | null
    }[]).map((c) => ({
      id: String(c.id),
      name: c.name,
      brand: c.brand && typeof c.brand === 'object' && 'name' in c.brand ? c.brand.name : undefined,
      priceCents:
        c.productVariant && typeof c.productVariant === 'object' && 'priceInEUR' in c.productVariant
          ? (c.productVariant as { priceInEUR?: number }).priceInEUR ?? 0
          : 0,
    }))
    return ok({ alternatives })
  },
}

const resolveName = async (
  payload: Payload,
  row: ImportRow,
  errors: string[],
  index: number,
): Promise<{ subject: { kind: 'component' | 'category'; id: number | string }; target: { kind: 'component' | 'category'; id: number | string } } | null> => {
  // subject
  let subject: { kind: 'component' | 'category'; id: number | string } | null = null
  if (row.subjectType === 'category') {
    const cat = await payload.find({ collection: 'component-categories', where: { slug: { equals: row.subject } }, limit: 1 })
    if (cat.docs[0]) subject = { kind: 'category', id: cat.docs[0].id }
  } else {
    const comp = await payload.find({ collection: 'components', where: { name: { equals: row.subject } }, limit: 1 })
    if (comp.docs[0]) subject = { kind: 'component', id: comp.docs[0].id }
  }
  if (!subject) {
    errors.push(`row ${index + 1}: subject "${row.subject}" not found`)
    return null
  }
  // target
  let target: { kind: 'component' | 'category'; id: number | string } | null = null
  if (row.targetType === 'category') {
    const cat = await payload.find({ collection: 'component-categories', where: { slug: { equals: row.targetCategory } }, limit: 1 })
    if (cat.docs[0]) target = { kind: 'category', id: cat.docs[0].id }
  } else {
    const comp = await payload.find({ collection: 'components', where: { name: { equals: row.targetCategory } }, limit: 1 })
    if (comp.docs[0]) target = { kind: 'component', id: comp.docs[0].id }
  }
  if (!target) {
    errors.push(`row ${index + 1}: target "${row.targetCategory}" not found`)
    return null
  }
  return { subject, target }
}

export const builderRulesImportEndpoint: Endpoint = {
  path: '/builder/rules/import',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!requireStaff(req.user)) return bad(401, 'admin or manager role required')
    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return bad(400, 'invalid JSON body')
    }
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) return bad(400, 'invalid rows', parsed.error.flatten())
    const errors: string[] = []
    let created = 0
    for (const [index, row] of parsed.data.rows.entries()) {
      // eslint-disable-next-line no-await-in-loop
      const resolved = await resolveName(req.payload, row, errors, index)
      if (!resolved) continue
      try {
        // eslint-disable-next-line no-await-in-loop
        await req.payload.create({
          collection: 'compatibility-rules',
          data: {
            subjectType: resolved.subject.kind,
            ...(resolved.subject.kind === 'component'
              ? { subjectComponent: resolved.subject.id }
              : { subjectCategory: resolved.subject.id }),
            targetType: resolved.target.kind,
            ...(resolved.target.kind === 'component'
              ? { targetComponent: resolved.target.id }
              : { targetCategory: resolved.target.id }),
            type: row.type,
            operator: row.operator,
            field: row.field,
            value: row.value,
            severity: row.severity,
            bidirectional: false,
            message: row.message ?? '',
            enabled: true,
          } as never,
        })
        created++
      } catch (e) {
        errors.push(`row ${index + 1}: ${e instanceof Error ? e.message : 'create failed'}`)
      }
    }
    return ok({ created, errors })
  },
}
