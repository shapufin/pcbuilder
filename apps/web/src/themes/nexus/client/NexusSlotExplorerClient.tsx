'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play, RotateCcw, Wrench } from 'lucide-react'
import { playMountSound, playSparkleSound, playTickSound } from '../lib/audio'
import type { ExplorerSlot, ExplorerSlotKey } from '../lib/slot-explorer.server'

/**
 * Entry 71 (Nexus) — interactive motherboard slot explorer ported from
 * `shop layout/src/views/CategoryExplorerView.tsx`, adapted to the plain-CSS
 * nx-* layer: slots are absolutely-positioned buttons on the 16:10 board,
 * sparks draw on a canvas overlay (rAF only runs while particles live).
 *
 * Interaction contract (plan §23): first click mounts a slot (particles +
 * sounds + board shake); clicking a mounted slot navigates to the product
 * (`/product/[slug]`) or the mapped category when no product resolved.
 * No add-to-cart here — variant resolution lives on the PDP/builder.
 */

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  life: number
  maxLife: number
  /** Resolved CSS color — read from --nx-accent at burst time so the
   *  visitor alt-theme recolors sparks too. */
  color: string
}

const INITIAL_MOUNTED: Record<string, boolean> = {
  cpu: true,
  gpu: true,
  ram: true,
  power: true,
}

export function NexusSlotExplorerClient({ slots }: { slots: ExplorerSlot[] }) {
  const router = useRouter()
  const boardRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef(0)

  const [mounted, setMounted] = useState<Record<string, boolean>>(INITIAL_MOUNTED)
  // Mount keeps working under reduced motion — only the burst/shake FX skip.
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [shaking, setShaking] = useState(false)
  const [isMountingAll, setIsMountingAll] = useState(false)

  const mountedCount = slots.filter((s) => mounted[s.key]).length

  // Draw loop — starts on demand, stops itself when particles drain.
  const pump = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const step = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.94
        p.vy *= 0.94
        p.life++
        p.alpha = Math.max(0, 1 - p.life / p.maxLife)
        if (p.life >= p.maxLife) return false
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        return true
      })
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const burstAt = useCallback(
    (slot: ExplorerSlot) => {
      const board = boardRef.current
      const canvas = canvasRef.current
      if (!board || !canvas) return
      const rect = board.getBoundingClientRect()
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width
        canvas.height = rect.height
      }
      const cx = ((slot.pos.left + slot.pos.width / 2) / 100) * rect.width
      const cy = ((slot.pos.top + slot.pos.height / 2) / 100) * rect.height
      const accent =
        getComputedStyle(board).getPropertyValue('--nx-accent').trim() || 'rgb(0,238,252)'
      for (let i = 0; i < 42; i++) {
        const angle = (Math.PI * 2 * i) / 42 + (Math.random() - 0.5)
        const speed = 2.5 + Math.random() * 5.5
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 3.5,
          alpha: 1,
          life: 0,
          maxLife: 35 + Math.random() * 25,
          color: i % 3 === 0 ? 'rgba(255,255,255,0.9)' : accent,
        })
      }
      pump()
    },
    [pump],
  )

  const shake = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 340)
  }, [])

  const mountSlot = useCallback(
    (slot: ExplorerSlot) => {
      playMountSound()
      playSparkleSound()
      setMounted((prev) => ({ ...prev, [slot.key]: true }))
      if (!prefersReducedMotion.current) {
        burstAt(slot)
        shake()
      }
    },
    [burstAt, shake],
  )

  const handleSlotClick = (slot: ExplorerSlot) => {
    if (!mounted[slot.key]) {
      mountSlot(slot)
      return
    }
    playTickSound()
    router.push(slot.product ? `/product/${slot.product.slug}` : `/shop/${slot.categorySlug}`)
  }

  const handleMountAll = async () => {
    if (isMountingAll) return
    setIsMountingAll(true)
    const order: ExplorerSlotKey[] = ['motherboard', 'power', 'cpu', 'ram', 'storage', 'gpu', 'cooling', 'case']
    for (const key of order) {
      const slot = slots.find((s) => s.key === key)
      if (!slot || mounted[slot.key]) continue
      mountSlot(slot)
      await new Promise((r) => setTimeout(r, 380))
    }
    setIsMountingAll(false)
  }

  const handleReset = () => {
    playTickSound()
    setMounted({})
  }

  return (
    <div className={shaking ? 'nx-explorer__stage nx-explorer__shaking' : 'nx-explorer__stage'}>
      <div ref={boardRef} className="nx-explorer__board">
        <canvas ref={canvasRef} className="nx-explorer__particles" aria-hidden />
        {slots.map((slot) => {
          const isMounted = Boolean(mounted[slot.key])
          return (
            <button
              key={slot.key}
              type="button"
              className={isMounted ? 'nx-slot nx-slot--mounted' : 'nx-slot'}
              style={{
                left: `${slot.pos.left}%`,
                top: `${slot.pos.top}%`,
                width: `${slot.pos.width}%`,
                height: `${slot.pos.height}%`,
              }}
              aria-label={
                isMounted
                  ? slot.product
                    ? `View ${slot.product.title}`
                    : `Browse ${slot.label}`
                  : `Mount ${slot.label}`
              }
              onClick={() => handleSlotClick(slot)}
            >
              <span className="nx-slot__key">{slot.slotName}</span>
              <span className="nx-slot__name">{slot.label}</span>
              <span className="nx-slot__product">
                {isMounted
                  ? (slot.product?.title ?? `Browse ${slot.label}`)
                  : 'Click to mount'}
              </span>
            </button>
          )
        })}
      </div>
      <div className="nx-explorer__bar">
        <span>
          {mountedCount}/{slots.length} slots mounted
        </span>
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="nx-btn nx-btn--ghost"
            onClick={handleMountAll}
            disabled={isMountingAll}
          >
            <Play size={12} aria-hidden />
            {isMountingAll ? 'Calibrating…' : 'Auto-mount all'}
          </button>
          <button type="button" className="nx-btn nx-btn--ghost" onClick={handleReset}>
            <RotateCcw size={12} aria-hidden />
            Reset
          </button>
          <Link href="/builder" className="nx-btn nx-btn--primary">
            <Wrench size={12} aria-hidden />
            Configure in builder
          </Link>
        </span>
      </div>
    </div>
  )
}
