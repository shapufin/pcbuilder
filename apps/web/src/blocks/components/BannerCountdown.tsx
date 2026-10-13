'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { BannerCountdownBlock as BannerCountdownBlockType } from '@/payload-types'

export function BannerCountdown({ block }: { block: Partial<BannerCountdownBlockType> }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    if (!block.countdownEnd) return

    const target = new Date(block.countdownEnd).getTime()
    if (isNaN(target)) return

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [block.countdownEnd])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <section className="blk">
      <div className="blk-countdown-banner" data-variant={block.variant || 'cyber-neon'}>
        {block.badgeText && <span className="blk-countdown-banner__badge">{block.badgeText}</span>}
        {block.heading && <h2 className="blk-countdown-banner__title">{block.heading}</h2>}
        {block.subheading && <p className="blk-countdown-banner__sub">{block.subheading}</p>}

        {timeLeft && (
          <div className="blk-countdown-timer" aria-label="Countdown timer">
            <div className="blk-countdown-unit">
              <span className="blk-countdown-val">{pad(timeLeft.days)}</span>
              <span className="blk-countdown-lbl">Days</span>
            </div>
            <div className="blk-countdown-unit">
              <span className="blk-countdown-val">{pad(timeLeft.hours)}</span>
              <span className="blk-countdown-lbl">Hours</span>
            </div>
            <div className="blk-countdown-unit">
              <span className="blk-countdown-val">{pad(timeLeft.minutes)}</span>
              <span className="blk-countdown-lbl">Mins</span>
            </div>
            <div className="blk-countdown-unit">
              <span className="blk-countdown-val">{pad(timeLeft.seconds)}</span>
              <span className="blk-countdown-lbl">Secs</span>
            </div>
          </div>
        )}

        {block.ctaLabel && block.ctaUrl && (
          <Link href={block.ctaUrl} className="btn btn--primary btn--lg">
            {block.ctaLabel} →
          </Link>
        )}
      </div>
    </section>
  )
}
