import { describe, expect, it } from 'vitest'
import type { BuilderIndex } from '@buildmyrig/lib'
import { buildManifest, parseBuildJson, serializeBuild } from './build-io'

/**
 * Design kit #329+ — manifest Deploy, export serializzato (slug, JSON-safe)
 * e import validato: slug→id, componenti esistenti e nello slot giusto.
 */

const component = (
  id: string,
  categoryId: string,
  priceCents: number,
  tdpWatts?: number,
): BuilderIndex['components'][number] => ({
  id,
  categoryId,
  priceCents,
  specs: tdpWatts === undefined ? {} : { tdpWatts },
  display: { name: `Part ${id}` },
})

const index: BuilderIndex = {
  components: [
    component('cpu-1', 'cat-cpu', 25000, 105),
    component('gpu-1', 'cat-gpu', 80000, 220),
    component('ram-1', 'cat-ram', 9000, 8),
  ],
  rules: [],
  categories: [
    { id: 'cat-cpu', slug: 'cpu', name: 'Processore', required: true, maxSelectable: 1, sortOrder: 1 },
    { id: 'cat-gpu', slug: 'gpu', name: 'Scheda video', required: true, maxSelectable: 1, sortOrder: 2 },
    { id: 'cat-ram', slug: 'ram', name: 'RAM', required: true, maxSelectable: 4, sortOrder: 3 },
  ],
  power: { overheadMultiplier: 1.3, baseWatts: 100 },
  rulesVersion: 'test',
}

describe('build-io', () => {
  it('#329 buildManifest produce righe reali: parti, watt, totale', () => {
    const lines = buildManifest({
      name: 'Vanguard',
      slots: [
        { categoryId: 'cat-cpu', componentIds: ['cpu-1'] },
        { categoryId: 'cat-gpu', componentIds: ['gpu-1'] },
      ],
      index,
      totalCents: 105000,
      recommendedPsuWatts: 523,
    })
    expect(lines[0]).toBe('Build: Vanguard')
    expect(lines[1]).toContain('Processore: Part cpu-1')
    expect(lines[1]).toContain('250')
    expect(lines[1]).toContain('105 W')
    expect(lines[2]).toContain('Scheda video: Part gpu-1')
    expect(lines[3]).toBe('Estimated power: 523 W')
    expect(lines[4]).toContain('Components total')
  })

  it('#358 buildManifest appends the share link line when shareUrl is passed', () => {
    const lines = buildManifest({
      slots: [{ categoryId: 'cat-cpu', componentIds: ['cpu-1'] }],
      index,
      totalCents: 25000,
      shareUrl: 'http://localhost:3000/build/abc123',
    })
    expect(lines.at(-1)).toBe('Share link: http://localhost:3000/build/abc123')
    // No shareUrl → no share line (manifest stays parts+watts+total only).
    const plain = buildManifest({
      slots: [{ categoryId: 'cat-cpu', componentIds: ['cpu-1'] }],
      index,
      totalCents: 25000,
    })
    expect(plain.some((l) => l.startsWith('Share link:'))).toBe(false)
  })

  it('#330 serializeBuild emette slug + componentIds, rgbColor opzionale', () => {
    const out = serializeBuild({
      selections: { 'cat-cpu': ['cpu-1'], 'cat-ram': ['ram-1'], 'cat-empty': [] },
      index,
      name: 'Vanguard',
      rgbColor: '#38bdf8',
    })
    expect(out).toEqual({
      name: 'Vanguard',
      rgbColor: '#38bdf8',
      slots: [
        { categorySlug: 'cpu', componentIds: ['cpu-1'] },
        { categorySlug: 'ram', componentIds: ['ram-1'] },
      ],
    })
    // JSON-safe: niente riferimenti condivisi con lo store
    out.slots[0].componentIds.push('mutato')
    expect(out.slots[0].componentIds).toEqual(['cpu-1', 'mutato'])
  })

  it('#330b parseBuildJson round-trip: slug→id, righe piatte stile TemplateSlot', () => {
    const parsed = parseBuildJson(
      JSON.stringify({
        name: 'Vanguard',
        rgbColor: '#fb923c',
        slots: [
          { categorySlug: 'cpu', componentIds: ['cpu-1'] },
          { categorySlug: 'ram', componentIds: ['ram-1'] },
        ],
      }),
      index,
    )
    expect(parsed).toEqual({
      name: 'Vanguard',
      rgbColor: '#fb923c',
      slots: [
        { categoryId: 'cat-cpu', componentId: 'cpu-1' },
        { categoryId: 'cat-ram', componentId: 'ram-1' },
      ],
    })
  })

  it('#330c parseBuildJson tollera rgbColor mancante/invalido, respinge slug e id sconosciuti', () => {
    const noColor = parseBuildJson({ slots: [{ categorySlug: 'cpu', componentIds: ['cpu-1'] }] }, index)
    expect(noColor).toEqual({ slots: [{ categoryId: 'cat-cpu', componentId: 'cpu-1' }] })

    const badColor = parseBuildJson(
      { rgbColor: 'rosso', slots: [{ categorySlug: 'cpu', componentIds: ['cpu-1'] }] },
      index,
    )
    expect(badColor).not.toHaveProperty('error')
    expect(badColor).not.toHaveProperty('rgbColor')

    expect(parseBuildJson({ slots: [{ categorySlug: 'nope', componentIds: ['cpu-1'] }] }, index))
      .toEqual({ error: 'Unknown slot: nope' })
    expect(parseBuildJson({ slots: [{ categorySlug: 'cpu', componentIds: ['ghost'] }] }, index))
      .toEqual({ error: 'Unknown component: ghost' })
    // real component in the wrong slot
    expect(parseBuildJson({ slots: [{ categorySlug: 'cpu', componentIds: ['gpu-1'] }] }, index))
      .toEqual({ error: 'gpu-1 does not belong to slot cpu' })
    expect(parseBuildJson('{bad json', index)).toEqual({ error: 'Invalid JSON' })
    expect(parseBuildJson({ name: 'x' }, index)).toEqual({ error: 'Missing the slot list' })
  })
})
