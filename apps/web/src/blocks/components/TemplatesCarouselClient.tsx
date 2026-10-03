'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useBuilderStore } from '@/app/builder/builder-store'
import { formatEUR } from '@/components/ui/Price'

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
    <div className="blk">
      <div className="tpl-carousel__head">
        <h2 className="tpl-carousel__title">{heading}</h2>
        <div className="tpl-carousel__arrows">
          <button type="button" aria-label="Scroll left" onClick={() => scrollByCard(-1)} className="tpl-arrow">
            ←
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => scrollByCard(1)} className="tpl-arrow">
            →
          </button>
        </div>
      </div>
      <div ref={trackRef} className="tpl-carousel__track">
        {templates.map((t, i) => (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => selectTemplate(t)}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
            className="tpl-card"
          >
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image} alt="" className="tpl-card__img" />
            ) : null}
            <strong className="tpl-card__name">{t.name}</strong>
            {t.description ? (
              <span className="tpl-card__desc">
                {t.description.slice(0, 90)}
                {t.description.length > 90 ? '…' : ''}
              </span>
            ) : null}
            <span className="tpl-card__price">from {formatEUR(t.basePriceCents)}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
