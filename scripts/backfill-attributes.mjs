#!/usr/bin/env node
/**
 * Backfill catalogue attributes (entry 64). `products.attributeValues` (and
 * the attribute-type display names) were added after the first dev DB was
 * seeded, so existing products carry `attributeValues: []` and the facet
 * sidebar / PDP compatibility list have nothing to render. The seed itself is
 * correct — only pre-existing rows need repair.
 *
 * Idempotent: re-running patches the same values. Safe on a fresh DB too.
 *
 * Usage (prod server on :3000, admin creds from env or the seed defaults):
 *   node scripts/backfill-attributes.mjs [--base=http://localhost:3000]
 *
 * Node 24 strips the TS types on the seed-data import.
 */
import { productDefs, attributeTypeNames } from '../apps/web/src/seed-data.ts'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}

const base = arg('base', process.env.BMR_URL || 'http://localhost:3000')
const email = arg('email', process.env.BMR_ADMIN_EMAIL || 'admin@buildmyrig.test')
const password = arg('password', process.env.BMR_ADMIN_PASSWORD || 'Password123!')

const json = async (path, init = {}) => {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      ...(init.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(body).slice(0, 200)}`)
  return body
}

const login = await json('/api/users/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
})
const auth = { Authorization: `JWT ${login.token}` }

const types = (await json('/api/attribute-types?limit=100&depth=0')).docs
const values = (await json('/api/attribute-values?limit=500&depth=0')).docs
const typeBySlug = new Map(types.map((t) => [t.slug, t]))
const valueByTypeValue = new Map(values.map((v) => [`${v.attributeType}:${v.value}`, v]))

// Same slugify the seed applies to product titles (seed.ts, products.create).
const slugOf = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

let namesFixed = 0
for (const t of types) {
  const want = attributeTypeNames[t.slug]
  if (want && t.name !== want) {
    await json(`/api/attribute-types/${t.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ name: want }),
    })
    namesFixed += 1
  }
}

let patched = 0
let skipped = 0
for (const def of productDefs) {
  const attrs = def.attrs ?? {}
  const wanted = Object.entries(attrs)
  if (wanted.length === 0) continue

  const found = (
    await json(`/api/products?limit=1&depth=0&where[slug][equals]=${encodeURIComponent(slugOf(def.title))}`)
  ).docs[0]
  if (!found) {
    console.warn(`  ! product not found: ${def.title}`)
    skipped += 1
    continue
  }

  const rows = []
  for (const [slug, value] of wanted) {
    const type = typeBySlug.get(slug)
    const val = type ? valueByTypeValue.get(`${type.id}:${value}`) : null
    if (!type || !val) {
      console.warn(`  ! missing attribute ${slug}=${value} for ${def.title}`)
      continue
    }
    rows.push({ attributeType: type.id, value: val.id })
  }
  if (rows.length === 0) {
    skipped += 1
    continue
  }

  const current = JSON.stringify(
    (found.attributeValues ?? []).map((r) => ({
      attributeType: typeof r.attributeType === 'object' ? r.attributeType?.id : r.attributeType,
      value: typeof r.value === 'object' ? r.value?.id : r.value,
    })),
  )
  const next = JSON.stringify(rows.map((r) => ({ attributeType: r.attributeType, value: r.value })))
  if (current === next) continue

  await json(`/api/products/${found.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ attributeValues: rows }),
  })
  patched += 1
}

console.log(`backfill-attributes: ${patched} product(s) patched, ${namesFixed} type name(s) fixed, ${skipped} skipped`)
