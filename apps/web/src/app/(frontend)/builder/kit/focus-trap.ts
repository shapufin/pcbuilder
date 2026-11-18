/**
 * Dialog focus containment (entry 131).
 *
 * `nextTrapIndex` is the pure decision; `focusables` is the DOM query. Keeping
 * the decision separate makes the tab order testable without a browser.
 *
 * Returns the index to focus, or -1 when the browser should handle the key
 * itself (the common case: Tab in the middle of the dialog).
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function nextTrapIndex(count: number, activeIndex: number, shift: boolean): number {
  if (count <= 0) return -1
  if (activeIndex < 0 || activeIndex >= count) return shift ? count - 1 : 0
  if (shift) return activeIndex === 0 ? count - 1 : -1
  return activeIndex === count - 1 ? 0 : -1
}

/** Visible, focusable descendants in DOM order. */
export function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    // offsetParent is null for position:fixed children, so use layout boxes
    // (the jQuery :visible check) — also excludes visibility:hidden.
    (el) =>
      el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0,
  )
}

/**
 * Tab/Shift+Tab handler for a dialog root. Returns true when it moved focus
 * (the caller should preventDefault).
 */
export function trapTabKey(
  root: HTMLElement | null,
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>,
): boolean {
  if (event.key !== 'Tab') return false
  const items = focusables(root)
  const active = document.activeElement as HTMLElement | null
  const index = nextTrapIndex(items.length, active ? items.indexOf(active) : -1, event.shiftKey)
  if (index < 0) return false
  event.preventDefault()
  items[index]?.focus()
  return true
}
