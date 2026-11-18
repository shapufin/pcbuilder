import { describe, expect, it } from 'vitest'
import { nextTrapIndex } from './focus-trap'

/**
 * Entry 131 — dialog focus containment. Before this, Tab walked out of the
 * dialog into the page behind it (a pre-existing a11y gap in every builder
 * modal). The decision is pure so the tab order is pinned here.
 */
describe('dialog focus trap (entry 131)', () => {
  it('#699 an empty dialog never traps', () => {
    expect(nextTrapIndex(0, -1, false)).toBe(-1)
    expect(nextTrapIndex(0, 0, true)).toBe(-1)
  })

  it('#700 Tab from the last element wraps to the first', () => {
    expect(nextTrapIndex(3, 2, false)).toBe(0)
  })

  it('#701 Shift+Tab from the first element wraps to the last', () => {
    expect(nextTrapIndex(3, 0, true)).toBe(2)
  })

  it('#702 Tab in the middle is left to the browser', () => {
    expect(nextTrapIndex(3, 1, false)).toBe(-1)
    expect(nextTrapIndex(3, 1, true)).toBe(-1)
  })

  it('#703 focus outside the dialog is pulled back in', () => {
    expect(nextTrapIndex(3, -1, false)).toBe(0)
    expect(nextTrapIndex(3, -1, true)).toBe(2)
    expect(nextTrapIndex(3, 9, false)).toBe(0)
  })
})
