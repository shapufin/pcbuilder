import { describe, expect, it, vi } from 'vitest'
import { AttributeValues } from './attribute-values.ts'
import { AttributeTypes } from './attribute-types.ts'

describe('Attribute collections hooks', () => {
  it('AttributeValues beforeValidate rejects duplicate terms within same attributeType', async () => {
    const hook = AttributeValues.hooks?.beforeValidate?.[0]
    expect(hook).toBeDefined()

    const mockFind = vi.fn().mockResolvedValue({ docs: [{ id: 1, value: 'AM5' }] })
    const req = {
      payload: { find: mockFind },
    }

    await expect(
      hook!({
        data: { attributeType: 10, value: 'AM5' },
        req: req as never,
        operation: 'create',
      } as never),
    ).rejects.toThrow(/already exists/)

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'attribute-values',
        where: expect.objectContaining({
          and: expect.arrayContaining([
            { attributeType: { equals: 10 } },
            { value: { equals: 'AM5' } },
          ]),
        }),
      }),
    )
  })

  it('AttributeValues beforeValidate allows unique term', async () => {
    const hook = AttributeValues.hooks?.beforeValidate?.[0]
    expect(hook).toBeDefined()

    const mockFind = vi.fn().mockResolvedValue({ docs: [] })
    const req = {
      payload: { find: mockFind },
    }

    const data = { attributeType: 10, value: 'LGA1851' }
    const result = await hook!({
      data,
      req: req as never,
      operation: 'create',
    } as never)

    expect(result).toEqual(data)
  })

  it('AttributeTypes afterDelete cascade deletes associated attribute-values', async () => {
    const hook = AttributeTypes.hooks?.afterDelete?.[0]
    expect(hook).toBeDefined()

    const mockDelete = vi.fn().mockResolvedValue({ docs: [] })
    const mockLogger = { error: vi.fn() }
    const req = {
      payload: { delete: mockDelete, logger: mockLogger },
    }

    await hook!({
      id: 42,
      req: req as never,
      doc: {} as never,
    } as never)

    expect(mockDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'attribute-values',
        where: { attributeType: { equals: 42 } },
        overrideAccess: true,
      }),
    )
  })
})
