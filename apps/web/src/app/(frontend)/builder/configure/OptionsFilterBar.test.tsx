import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OptionsFilterBar } from './OptionsFilterBar'

const props = { query: '', brand: null, brands: ['AMD', 'Intel'], onQuery: () => {}, onBrand: () => {} }

describe('OptionsFilterBar', () => {
  it('#399 two mounted copies get distinct search-input ids (drawer + inline both mount it)', () => {
    const html = renderToStaticMarkup(
      <>
        <OptionsFilterBar {...props} />
        <OptionsFilterBar {...props} />
      </>,
    )
    const ids = [...html.matchAll(/id="(option-search[^"]*)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    // Each label points at its own input, not the sibling copy's.
    const fors = [...html.matchAll(/for="(option-search[^"]*)"/g)].map((m) => m[1])
    expect(new Set(fors)).toEqual(new Set(ids))
  })
})
