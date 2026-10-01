'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useBuilderStore } from '@/app/builder/builder-store'

type CarouselTemplate = {
  id: string
  name: string
  slug: string
  description: string | null
  tags: string[]
  basePriceCents: number
  image: string | null
  slots: { categoryId: string; componentId: string }[]
}

const eur = (cents: number): string => `€${(cents / 100).toFixed(2)}`

export function TemplatesCarouselClient({
  heading,
  templates,
  autoplay,
}: {
  heading: string
  templates: CarouselTemplate[]
  autoplay: boolean
}) {
  const router = useRouter()
  const applyTemplate = useBuilderStore((s) => s.applyTemplate)
  const trackRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 400), behavior: 'smooth' })
  }

  useEffect(() => {
    if (!autoplay) return
    timerRef.current = setInterval(() => {
      const el = trackRef.current
      if (!el) return
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' })
      }
    }, 4000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoplay])

  const selectTemplate = (t: CarouselTemplate) => {
    applyTemplate(
      t.id,
      t.slots.map((s) => ({ categoryId: s.categoryId, componentId: s.componentId })),
      'template',
    )
    void router.push('/builder/configure')
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{heading}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" aria-label="Scroll left" onClick={() => scrollByCard(-1)} style={arrowBtn}>
            ←
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => scrollByCard(1)} style={arrowBtn}>
            →
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory' }}
      >
        {templates.map((t, i) => (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => selectTemplate(t)}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
            style={{
              flex: '0 0 280px',
              scrollSnapAlign: 'start',
              textAlign: 'left',
              border: '1px solid var(--color-surface)',
              borderRadius: 12,
              padding: 16,
              background: 'var(--color-bg)',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
            ) : null}
            <strong style={{ display: 'block', marginBottom: 6 }}>{t.name}</strong>
            {t.description ? (
              <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                {t.description.slice(0, 90)}
                {t.description.length > 90 ? '…' : ''}
              </span>
            ) : null}
            <span style={{ color: 'var(--color-primary-hover)', fontWeight: 700 }}>from {eur(t.basePriceCents)}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

const arrowBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  cursor: 'pointer',
  fontSize: 16,
}
