import { describe, it, expect, vi } from 'vitest'
import { DerivedPowerRules } from './derived-power-rules.ts'

/**
 * `derived-power-rules` is a single global config: the builder index honors
 * `docs[0]` only, so a second doc used to be a silent no-op (audit minor C8).
 * The collection now rejects a second doc with a clear message.
 */
const beforeValidate = DerivedPowerRules.hooks?.beforeValidate?.[0] as (args: {
  data: Record<string, unknown>
  req: { payload: { find: (args: unknown) => Promise<{ totalDocs: number }> } }
  operation?: string
}) => Promise<void> | void

const makeReq = (totalDocs: number) => ({
  payload: { find: vi.fn(async () => ({ totalDocs })) },
})

describe('derived-power-rules singleton guard', () => {
  it('#252 rejects a second doc on create with a clear message', async () => {
    await expect(
      beforeValidate({ data: { baseWatts: 100 }, req: makeReq(1) as never, operation: 'create' }),
    ).rejects.toThrow(/single/i)
  })

  it('#253 allows the first doc on create', async () => {
    await expect(
      beforeValidate({ data: { baseWatts: 100 }, req: makeReq(0) as never, operation: 'create' }),
    ).resolves.toBeUndefined()
  })

  it('#254 allows updating the existing doc', async () => {
    await expect(
      beforeValidate({ data: { baseWatts: 120 }, req: makeReq(1) as never, operation: 'update' }),
    ).resolves.toBeUndefined()
  })
})
