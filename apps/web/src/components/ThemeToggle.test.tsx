import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeToggle } from './ThemeToggle'

/**
 * Visitor theme toggle (entry 60) — SSR contract. The button must render
 * server-side in the header with its a11y contract intact; the alt state
 * is client-only (localStorage) and always renders "default" on the server.
 */
describe('ThemeToggle', () => {
  it('#407 renders an accessible toggle for the alt preset', () => {
    const html = renderToStaticMarkup(
      <ThemeToggle altLabel="Light" defaultLabel="RIG Dark" />,
    )
    expect(html).toContain('class="theme-toggle"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('Switch to Light')
    expect(html).toContain('<svg')
  })

  it('#408 reflects whatever alt label the server resolved', () => {
    const html = renderToStaticMarkup(
      <ThemeToggle altLabel="Precision Dark" defaultLabel="Light" />,
    )
    expect(html).toContain('Switch to Precision Dark')
  })
})
