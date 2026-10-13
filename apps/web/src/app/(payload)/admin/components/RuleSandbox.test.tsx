import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RuleSandbox, evaluateSandbox } from './RuleSandbox.tsx'
import type { BuilderIndex } from '@buildmyrig/lib'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const index: BuilderIndex = {
  categories: [
    { id: '1', slug: 'cpu', name: 'CPU', required: true, maxSelectable: 1, sortOrder: 1 },
    { id: '2', slug: 'motherboard', name: 'Motherboard', required: true, maxSelectable: 1, sortOrder: 2 },
    { id: '4', slug: 'gpu', name: 'Graphics Card', required: true, maxSelectable: 1, sortOrder: 4 },
    { id: '6', slug: 'psu', name: 'Power Supply', required: true, maxSelectable: 1, sortOrder: 6 },
    { id: '7', slug: 'case', name: 'Case', required: true, maxSelectable: 1, sortOrder: 7 },
  ],
  components: [
    { id: 'c1', categoryId: '1', priceCents: 41900, specs: { socket: 'AM5', tdpWatts: 120 }, display: { name: 'Ryzen 7 7800X3D' } },
    { id: 'c2', categoryId: '1', priceCents: 40900, specs: { socket: 'LGA1700', tdpWatts: 125 }, display: { name: 'Core i7-14700K' } },
    { id: 'm1', categoryId: '2', priceCents: 27900, specs: { socket: 'AM5', moboFormFactor: 'ATX' }, display: { name: 'B650E-F AM5' } },
    { id: 'g1', categoryId: '4', priceCents: 118900, specs: { gpuLengthMm: 357, tdpWatts: 320 }, display: { name: 'RTX 4080 Super' } },
    { id: 'p1', categoryId: '6', priceCents: 14900, specs: { psuWatts: 850 }, display: { name: 'RM850x' } },
    { id: 'p2', categoryId: '6', priceCents: 7900, specs: { psuWatts: 550 }, display: { name: 'CX550' } },
    { id: 'k1', categoryId: '7', priceCents: 16900, specs: { caseGpuMaxLengthMm: 435, caseSupportedFormFactors: ['ATX'] }, display: { name: 'H9 Flow' } },
  ],
  rules: [],
  power: { overheadMultiplier: 1.3, baseWatts: 100, severity: 'warning', targetCategoryId: '6', targetCategorySlug: 'psu' },
  rulesVersion: 'test',
}

const good = { cpu: 'c1', motherboard: 'm1', gpu: 'g1', psu: 'p1', case: 'k1' }

describe('evaluateSandbox — real rule-engine diagnostics (#618 - #620)', () => {
  it('#618 passes socket match, clearance buffer and PSU headroom on a compatible pick', () => {
    const r = evaluateSandbox(index, good)
    const socket = r.diagnostics.find((d) => d.key === 'socket')
    expect(socket?.status).toBe('pass')
    const gpu = r.diagnostics.find((d) => d.key === 'gpu-clearance')
    expect(gpu?.status).toBe('pass')
    expect(gpu?.detail).toContain('78mm')
    const psu = r.diagnostics.find((d) => d.key === 'psu-headroom')
    expect(psu?.status).toBe('pass')
    // required = (120+320)*1.3+100 = 672W
    expect(r.requiredWatts).toBe(672)
  })

  it('#619 fails socket match and PSU headroom on an incompatible pick', () => {
    const r = evaluateSandbox(index, { ...good, cpu: 'c2', psu: 'p2' })
    expect(r.diagnostics.find((d) => d.key === 'socket')?.status).toBe('fail')
    expect(r.diagnostics.find((d) => d.key === 'psu-headroom')?.status).toBe('fail')
  })

  it('#620 degrades gracefully when a slot is unselected', () => {
    const r = evaluateSandbox(index, { cpu: 'c1' })
    expect(r.diagnostics.find((d) => d.key === 'socket')?.status).toBe('warn')
    expect(r.errors).toEqual([])
  })
})

describe('RuleSandbox component (#621)', () => {
  it('#621 renders selects, diagnostics and the reset action from a provided index', () => {
    const html = renderToStaticMarkup(<RuleSandbox index={index} />)
    expect(html).toContain('LIVE COMPATIBILITY ENGINE SANDBOX')
    expect(html).toContain('CPU Platform')
    expect(html).toContain('Motherboard')
    expect(html).toContain('Ryzen 7 7800X3D')
    expect(html).toContain('Reset to Standard Spec')
    expect(html).toContain('EVALUATED PIPELINE DIAGNOSTICS')
  })
})
