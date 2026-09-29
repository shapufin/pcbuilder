#!/usr/bin/env node
/**
 * Load test — Phase 4 (15-delivery-phases.md): smoke the public surface with
 * concurrent requests and report latency/status distributions. No deps.
 *
 * Usage:
 *   node scripts/load-test.mjs [--base=http://localhost:3000] [--concurrency=25] [--requests=100]
 *
 * Phase A (GETs): /api/builder/index, /api/products, /, /builder — expects 200s.
 * Phase B (POSTs): /api/builder/builds with an empty body — expects 400 from
 * zod, then 429s once the in-memory rate limiter (30/min/IP) kicks in; the
 * 429s are the point: they prove the limiter holds under concurrency.
 */

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}

const BASE = arg('base', 'http://localhost:3000')
const CONCURRENCY = Number(arg('concurrency', '25'))
const REQUESTS = Number(arg('requests', '100'))

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]

const runPhase = async (name, targets) => {
  console.log(`\n=== ${name} (concurrency=${CONCURRENCY}) ===`)
  for (const target of targets) {
    // Untimed warm-up: pays any cold-compile/cache cost outside the sample.
    await fetch(`${BASE}${target.path}`, {
      method: target.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(target.headers ?? {}) },
      ...(target.body !== undefined ? { body: JSON.stringify(target.body) } : {}),
      signal: AbortSignal.timeout(60_000),
    }).then((r) => r.arrayBuffer()).catch(() => {})

    const latencies = []
    const statuses = {}
    let errors = 0
    const total = target.requests ?? REQUESTS
    let claimed = 0
    const worker = async () => {
      for (;;) {
        // Claim the job BEFORE awaiting so workers never double-count.
        const index = claimed
        claimed += 1
        if (index >= total) return
        const started = performance.now()
        try {
          const res = await fetch(`${BASE}${target.path}`, {
            method: target.method ?? 'GET',
            headers: { 'content-type': 'application/json', ...(target.headers ?? {}) },
            ...(target.body !== undefined ? { body: JSON.stringify(target.body) } : {}),
            signal: AbortSignal.timeout(30_000),
          })
          latencies.push(performance.now() - started)
          statuses[res.status] = (statuses[res.status] ?? 0) + 1
          await res.arrayBuffer()
        } catch {
          errors += 1
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker))
    latencies.sort((a, b) => a - b)
    const statusStr = Object.entries(statuses)
      .sort((a, b) => a[0] - b[0])
      .map(([code, n]) => `${code}×${n}`)
      .join(' ')
    console.log(
      `${(target.method ?? 'GET').padEnd(4)} ${target.path.padEnd(28)} ` +
        `n=${latencies.length + errors} err=${errors} ` +
        `p50=${percentile(latencies, 50)?.toFixed(1) ?? '-'}ms ` +
        `p95=${percentile(latencies, 95)?.toFixed(1) ?? '-'}ms ` +
        `max=${latencies[latencies.length - 1]?.toFixed(1) ?? '-'}ms ` +
        `[${statusStr}]`,
    )
  }
}

const health = await fetch(`${BASE}/`).catch(() => null)
if (!health || !health.ok) {
  console.error(`Target ${BASE} is not reachable — start the dev server first (pnpm dev).`)
  process.exit(1)
}

await runPhase('Phase A — public GETs', [
  { path: '/api/builder/index' },
  { path: '/api/products?limit=10' },
  { path: '/' },
  { path: '/builder' },
])

await runPhase('Phase B — POST rate-limit probe', [
  // Empty body → zod 400 (cheap, no rows written); past 30/min/IP → 429.
  { path: '/api/builder/builds', method: 'POST', body: {}, requests: 60 },
])

console.log('\nDone.')
