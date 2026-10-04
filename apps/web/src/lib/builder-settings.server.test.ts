import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_BUILDER_DESIGN } from '@buildmyrig/plugin-pc-builder'

const findGlobal = vi.fn()

vi.mock('./shop', () => ({
  getPayloadClient: async () => ({ findGlobal }),
}))

const { getBuilderDesign } = await import('./builder-settings.server')

/**
 * Entry-55 review: the never-throw fallback had no coverage — a refactor
 * moving getPayloadClient()/findGlobal outside the try would break the
 * /builder/configure render on a dead DB without a test failing. Same
 * pattern as theme.server.test.ts.
 */
describe('getBuilderDesign — never-throw server resolver', () => {
  beforeEach(() => {
    findGlobal.mockReset()
  })

  it('#372 stored design resolves; unknown value falls back to default', async () => {
    findGlobal.mockResolvedValue({ design: 'classic' })
    expect(await getBuilderDesign()).toBe('classic')
    findGlobal.mockResolvedValue({ design: 'nonexistent-design' })
    expect(await getBuilderDesign()).toBe(DEFAULT_BUILDER_DESIGN)
    findGlobal.mockResolvedValue({})
    expect(await getBuilderDesign()).toBe(DEFAULT_BUILDER_DESIGN)
  })

  it('#373 payload failure falls back to the default design, never throws', async () => {
    findGlobal.mockRejectedValue(new Error('no such table: globals'))
    expect(await getBuilderDesign()).toBe(DEFAULT_BUILDER_DESIGN)
  })
})
