import { animate } from 'framer-motion'

/**
 * §4 add-to-cart animation (07-ux-plan.md): a chip flies from the trigger
 * element to the header cart anchor (#cart-anchor), 350ms.
 * No-op when the anchor is missing or the user prefers reduced motion.
 */
export function flyToCart(from: DOMRect, label: string): void {
  if (typeof document === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const anchor = document.getElementById('cart-anchor')
  if (!anchor) return
  const to = anchor.getBoundingClientRect()

  const chip = document.createElement('div')
  chip.textContent = label
  chip.setAttribute('aria-hidden', 'true')
  chip.style.cssText = [
    'position:fixed',
    `left:${from.left}px`,
    `top:${from.top}px`,
    'max-width:220px',
    'overflow:hidden',
    'white-space:nowrap',
    'text-overflow:ellipsis',
    'padding:6px 12px',
    'border-radius:999px',
    'background:#6366f1',
    'color:#fff',
    'font:600 13px system-ui',
    'box-shadow:0 6px 18px rgba(0,0,0,.35)',
    'z-index:9999',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(chip)

  const dx = to.left + to.width / 2 - from.left
  const dy = to.top + to.height / 2 - from.top
  const controls = animate(
    chip,
    { x: dx, y: dy, scale: 0.3, opacity: 0 },
    { duration: 0.35, ease: 'easeOut' },
  )
  void controls.then(() => chip.remove()).catch(() => chip.remove())
}
