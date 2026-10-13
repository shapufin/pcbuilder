import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CreateDocDrawerButton } from './CreateDocDrawerButton'

describe('CreateDocDrawerButton (#628 - #629)', () => {
  it('#628 renders a primary create button tagged with the collection slug and ships no drawer markup server-side', () => {
    const html = renderToStaticMarkup(
      <CreateDocDrawerButton collectionSlug="categories" label="Add Category" />,
    )

    expect(html).toContain('bmr-btn')
    expect(html).toContain('bmr-btn--primary')
    expect(html).toContain('Add Category')
    expect(html).toContain('data-create-drawer="categories"')
    expect(html).toContain('aria-label="Add Category"')
    // DocumentDrawer mounts lazily on first click — SSR markup stays drawer-free.
    expect(html).not.toContain('doc-drawer')
  })

  it('#629 falls back to a generic Create New label when none is provided', () => {
    const html = renderToStaticMarkup(<CreateDocDrawerButton collectionSlug="brands" />)

    expect(html).toContain('Create New')
    expect(html).toContain('data-create-drawer="brands"')
  })
})
