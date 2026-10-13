import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DesignSystemView } from './DesignSystemView'

describe('DesignSystemView (#630 - #632)', () => {
  it('#630 renders the UI Standards title, spec badge and navigation filter rail', () => {
    const html = renderToStaticMarkup(<DesignSystemView />)

    expect(html).toContain('UI Standards')
    expect(html).toContain('Form Spec')
    expect(html).toContain('bmr-ds-view')
    expect(html).toContain('bmr-filter-pills')
    expect(html).toContain('All Primitives')
    expect(html).toContain('Buttons')
    expect(html).toContain('Badges')
    expect(html).toContain('Forms')
    expect(html).toContain('Tables')
  })

  it('#631 renders every Button variant and size from the primitive library', () => {
    const html = renderToStaticMarkup(<DesignSystemView />)

    for (const variant of [
      'bmr-btn--primary',
      'bmr-btn--secondary',
      'bmr-btn--outline',
      'bmr-btn--ghost',
      'bmr-btn--destructive',
      'bmr-btn--subtle',
      'bmr-btn--link',
    ]) {
      expect(html, variant).toContain(variant)
    }
    for (const size of ['bmr-btn--sm', 'bmr-btn--md', 'bmr-btn--lg', 'bmr-btn--icon']) {
      expect(html, size).toContain(size)
    }
  })

  it('#632 renders Badge variants, form controls and the high-density table standard', () => {
    const html = renderToStaticMarkup(<DesignSystemView />)

    for (const badge of [
      'bmr-badge--success',
      'bmr-badge--warning',
      'bmr-badge--destructive',
      'bmr-badge--info',
      'bmr-badge--muted',
    ]) {
      expect(html, badge).toContain(badge)
    }
    expect(html).toContain('bmr-input-wrapper')
    expect(html).toContain('bmr-checkbox')
    expect(html).toContain('bmr-switch')
    expect(html).toContain('bmr-textarea')
    expect(html).toContain('bmr-table')
    expect(html).toContain('tabular-nums')
  })
})
