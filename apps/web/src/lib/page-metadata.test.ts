import { describe, expect, it } from 'vitest'
import { pageMetadata } from './page-metadata'

describe('pageMetadata titles (audit 2026-11-18 L6)', () => {
  it('#762 an editor SEO title gets the brand suffix once', () => {
    expect(pageMetadata({ title: 'About', seo: { title: 'About us' } } as never).title).toBe('About us | BuildMyRig')
    expect(pageMetadata({ title: 'FAQ', seo: { title: 'FAQ | BuildMyRig' } } as never).title).toBe('FAQ | BuildMyRig')
    expect(pageMetadata({ title: 'Contact' } as never).title).toBe('Contact | BuildMyRig')
  })
})
