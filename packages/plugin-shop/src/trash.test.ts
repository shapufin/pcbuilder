import { describe, expect, it } from 'vitest'
import type { CollectionConfig, Config } from 'payload'
import { shopPlugin } from './index.ts'

/**
 * Phase 4 / task 4.2 — trash on products.
 *
 * Products are the collection an admin deletes most often (duplicates,
 * discontinued SKUs, bad imports), and a hard delete takes the variant rows,
 * review relationships and order line references with it. Trash turns that
 * into a reversible PATCH of `deletedAt`; Payload excludes trashed docs from
 * `find` unless `trash: true` is requested, so the storefront keeps hiding
 * them without any query changes on our side.
 *
 * Autosave is deliberately *not* asserted here: this package disables it on
 * purpose (see the comment in `index.ts`) because upstream turns it on.
 */
const build = async (): Promise<Config> => {
  const base = {
    collections: [
      {
        slug: 'users',
        auth: true,
        fields: [{ name: 'email', type: 'email' }],
        access: {},
      } as unknown as CollectionConfig,
    ],
    globals: [],
  } as unknown as Config
  return (await shopPlugin()(base)) as Config
}

describe('trash on shop collections (#704)', () => {
  it('#704 products ship trash', async () => {
    const config = await build()
    const products = config.collections?.find((c) => c.slug === 'products') as
      | CollectionConfig
      | undefined
    expect(products, 'products collection missing from the built config').toBeDefined()
    expect(products?.trash).toBe(true)
  })
})
