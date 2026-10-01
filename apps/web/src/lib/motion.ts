import type { MotionProps } from 'framer-motion'

/**
 * Entry 23 item 3 - shared motion values for the 07-ux-plan animation spec:
 * dialog/sheet = scale .96→1 + fade 200ms; the cart drawer slides in over
 * --duration-base (250ms). Both collapse to a short fade under
 * prefers-reduced-motion (matches the existing CartBadge/fly-to-cart policy).
 */

type SpecMotion = Pick<MotionProps, 'initial' | 'animate' | 'exit' | 'transition'>

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function dialogMotion(reduced: boolean): SpecMotion {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15, ease: EASE_OUT },
    }
  }
  return {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { duration: 0.2, ease: EASE_OUT },
  }
}

export function drawerMotion(reduced: boolean): SpecMotion {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15, ease: EASE_OUT },
    }
  }
  return {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { duration: 0.25, ease: EASE_OUT },
  }
}

/** SSR-safe: no window (RSC/vitest node env) → false. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
