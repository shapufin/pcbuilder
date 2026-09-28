import type { Endpoint, Payload, PayloadRequest } from 'payload'
import { z } from 'zod'
import { interpolate } from '@buildmyrig/lib'
import { buildBuilderIndex, getEngine, requireStaff } from './lib/builder-index.ts'

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
      return bad(500, e instanceof Error ? e.message : 'index build failed')
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
      return bad(500, e instanceof Error ? e.message : 'conflict evaluation failed')
    }
  },
}

type ImportRow = z.infer<typeof importRowSchema>

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
