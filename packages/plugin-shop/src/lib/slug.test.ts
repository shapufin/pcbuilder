import { describe, it, expect } from 'vitest'
import { slugify } from './slug.ts'

describe('slugify (#637 - #639)', () => {
  it('#637 lowercases and hyphenates whitespace/punctuation', () => {
    expect(slugify('ASUS ROG Strix GeForce RTX 4080 Super')).toBe(
      'asus-rog-strix-geforce-rtx-4080-super',
    )
    expect(slugify('Intel Core i7-14700K — LGA1700!')).toBe('intel-core-i7-14700k-lga1700')
  })

  it('#638 collapses duplicate separators and trims edges', () => {
    expect(slugify('  --AMD   Ryzen__9__7950X--  ')).toBe('amd-ryzen-9-7950x')
    expect(slugify('a///b***c')).toBe('a-b-c')
  })

  it('#639 returns empty string for non-strings and folds diacritics', () => {
    expect(slugify(undefined)).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(42)).toBe('')
    expect(slugify('Corsair Déjà RGB')).toBe('corsair-deja-rgb')
  })
})
