import { describe, expect, it, vi } from 'vitest'
import { Components, disableCompatibilityRulesForComponent } from './components.ts'

describe('Components afterDelete hook — compatibility rules cleanup', () => {
  it('disables compatibility rules where subjectComponent or targetComponent matches deleted component id', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ docs: [] })
    const payload = { update: mockUpdate }

    await disableCompatibilityRulesForComponent(payload as any, 42)

    expect(mockUpdate).toHaveBeenCalledWith({
      collection: 'compatibility-rules',
      where: {
        or: [
          { subjectComponent: { equals: 42 } },
          { targetComponent: { equals: 42 } },
        ],
      },
      data: {
        enabled: false,
      },
    })
  })

  it('Components.hooks.afterDelete invokes disableCompatibilityRulesForComponent on deleted doc', async () => {
    const afterDeleteHooks = Components.hooks?.afterDelete ?? []
    expect(afterDeleteHooks.length).toBeGreaterThanOrEqual(3)

    const mockUpdate = vi.fn().mockResolvedValue({ docs: [] })
    const req = {
      payload: {
        update: mockUpdate,
        logger: { error: vi.fn() },
      },
    }

    for (const hook of afterDeleteHooks) {
      await (hook as any)({ doc: { id: 99 }, req: req as any, collection: Components as any, context: {}, id: 99 })
    }

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'compatibility-rules',
        where: {
          or: [
            { subjectComponent: { equals: 99 } },
            { targetComponent: { equals: 99 } },
          ],
        },
        data: { enabled: false },
      }),
    )
  })
})
