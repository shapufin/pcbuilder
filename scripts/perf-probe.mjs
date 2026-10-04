#!/usr/bin/env node
/**
 * Real-world LCP/FCP probe (entry 64 — home-LCP watch item).
 *
 * Lighthouse's default (lantern) simulation reports a pessimistic LCP: it
 * models a cold cache on a slow device/network and, for this app, inflates
 * the font-swap re-paint into ~3.7 s. This probe throttles a real Chromium
 * (mobile 4G + 4x CPU) and reads the actual paint entries, which is the
 * number to optimise against — and to re-check when fonts/CSS change.
 *
 * Usage:
 *   node scripts/perf-probe.mjs [--url=http://localhost:3000/] [--cpu=4] [--rtt=150] [--mbps=1.6]
 *
 * Requires a prod build served by `next start` (Playwright chromium is
 * already installed — see .devin/context/06-gotchas.md).
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// pnpm's strict node_modules layout means the repo root can't see
// apps/web's devDeps — resolve playwright from the app that declares it.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requires = [
  createRequire(import.meta.url),
  createRequire(path.join(repoRoot, 'apps', 'web', 'package.json')),
]
let chromium
for (const req of requires) {
  for (const specifier of ['@playwright/test', 'playwright', 'playwright-core']) {
    try {
      ;({ chromium } = req(specifier))
      break
    } catch {
      // try the next resolution root / specifier
    }
  }
  if (chromium) break
}
if (!chromium) {
  console.error('perf-probe: no playwright package resolvable (run from the repo root).')
  process.exit(1)
}

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}

const url = arg('url', 'http://localhost:3000/')
const cpu = Number(arg('cpu', '4'))
const rtt = Number(arg('rtt', '150'))
const mbps = Number(arg('mbps', '1.6'))

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 412, height: 823 } })
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: rtt,
  downloadThroughput: (mbps * 1024 * 1024) / 8,
  uploadThroughput: (mbps * 1024 * 1024) / 16,
})
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })

await page.addInitScript(() => {
  window.__probe = { lcp: [], fcp: [], fonts: [] }
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__probe.lcp.push({
        t: Math.round(e.startTime),
        size: e.size,
        el: e.element ? e.element.className || e.element.tagName : '?',
        url: e.url || '',
      })
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__probe.fcp.push({ name: e.name, t: Math.round(e.startTime) })
    }
  }).observe({ type: 'paint', buffered: true })
})

await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(6000)

const data = await page.evaluate(() => ({
  lcp: window.__probe.lcp,
  fcp: window.__probe.fcp,
  fonts: performance
    .getEntriesByType('resource')
    .filter((r) => r.name.includes('woff'))
    .map((r) => ({
      file: r.name.split('/').pop().slice(0, 24),
      start: Math.round(r.startTime),
      end: Math.round(r.responseEnd),
      kb: Math.round((r.transferSize || 0) / 1024),
    })),
  responseStart: Math.round(performance.getEntriesByType('navigation')[0].responseStart),
}))

const fcp = data.fcp.find((e) => e.name === 'first-contentful-paint')
const finalLcp = data.lcp[data.lcp.length - 1]

console.log(`perf-probe ${url}  (cpu ${cpu}x, rtt ${rtt}ms, ${mbps} Mbps)`)
console.log(`  TTFB (responseStart): ${data.responseStart} ms`)
console.log(`  FCP:  ${fcp ? fcp.t : '—'} ms`)
console.log(`  LCP:  ${finalLcp ? finalLcp.t : '—'} ms  (${finalLcp ? finalLcp.el : '—'})`)
console.log(`  LCP candidates: ${data.lcp.length}`)
for (const e of data.lcp) console.log(`    t=${e.t} size=${e.size} ${e.el} ${e.url}`)
console.log('  fonts:')
for (const f of data.fonts) console.log(`    ${f.file}  ${f.start}→${f.end} ms  ${f.kb} KB`)

await browser.close()
