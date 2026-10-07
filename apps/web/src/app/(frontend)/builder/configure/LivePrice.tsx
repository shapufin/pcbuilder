'use client'

import { useEffect, useState } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

/** Animated price counter (07-ux-plan animation spec: useSpring tween, 350ms). */
export function LivePrice({ cents }: { cents: number }) {
  const motionValue = useMotionValue(cents)
  const spring = useSpring(motionValue, { stiffness: 140, damping: 22 })
  const [display, setDisplay] = useState(cents)

  useEffect(() => {
    motionValue.set(cents)
  }, [cents, motionValue])

  useEffect(() => spring.on('change', (v) => setDisplay(v)), [spring])

  return (
    <span
      className="amount"
      aria-live="polite"
      aria-label={`Build total €${(cents / 100).toFixed(2)}`}
    >
      €{(display / 100).toFixed(2)}
    </span>
  )
}
