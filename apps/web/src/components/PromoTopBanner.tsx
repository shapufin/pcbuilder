'use client'

import React, { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import type { PromoBannerConfig } from '@buildmyrig/plugin-shop'

interface PromoTopBannerProps {
  promo?: PromoBannerConfig
}

function calculateTimeLeft(targetDate: string) {
  const difference = +new Date(targetDate) - +new Date()
  if (difference <= 0) return null

  const days = Math.floor(difference / (1000 * 60 * 60 * 24))
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((difference / 1000 / 60) % 60)
  const seconds = Math.floor((difference / 1000) % 60)

  return { days, hours, minutes, seconds }
}

const subscribeDismiss = (callback: () => void) => {
  window.addEventListener('storage', callback)
  window.addEventListener('bmr:dismiss_promo', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('bmr:dismiss_promo', callback)
  }
}

export function PromoTopBanner({ promo }: PromoTopBannerProps) {
  const storageKey = promo?.dismissible && promo?.text ? `bmr_promo_${promo.text.slice(0, 16)}` : null

  const isSessionDismissed = useSyncExternalStore(
    subscribeDismiss,
    () => {
      if (!storageKey) return false
      try {
        return sessionStorage.getItem(storageKey) === '1'
      } catch {
        return false
      }
    },
    () => false,
  )

  const [localDismissed, setLocalDismissed] = useState(false)
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    if (!promo?.enabled || !promo?.countdownEnd) return

    const target = promo.countdownEnd
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target))
    }, 1000)
    return () => clearInterval(timer)
  }, [promo?.enabled, promo?.countdownEnd])

  if (!promo || !promo.enabled || !promo.text || isSessionDismissed || localDismissed) {
    return null
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalDismissed(true)
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, '1')
        window.dispatchEvent(new Event('bmr:dismiss_promo'))
      } catch {
        // ignore
      }
    }
  }

  const variantClass = `promo-banner--${promo.variant || 'neon'}`

  const content = (
    <div className={`promo-banner ${variantClass}`}>
      <div className="promo-banner__inner">
        {promo.badgeText ? (
          <span className="promo-banner__badge">{promo.badgeText}</span>
        ) : null}
        <span className="promo-banner__text">{promo.text}</span>
        {timeLeft ? (
          <span className="promo-banner__countdown" aria-label="Time remaining">
            <span className="promo-banner__timer-unit">
              <strong>{String(timeLeft.days * 24 + timeLeft.hours).padStart(2, '0')}</strong>h
            </span>
            <span className="promo-banner__timer-sep">:</span>
            <span className="promo-banner__timer-unit">
              <strong>{String(timeLeft.minutes).padStart(2, '0')}</strong>m
            </span>
            <span className="promo-banner__timer-sep">:</span>
            <span className="promo-banner__timer-unit">
              <strong>{String(timeLeft.seconds).padStart(2, '0')}</strong>s
            </span>
          </span>
        ) : null}
      </div>
      {promo.dismissible ? (
        <button
          type="button"
          className="promo-banner__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss announcement banner"
        >
          ×
        </button>
      ) : null}
    </div>
  )

  if (promo.link) {
    return (
      <Link href={promo.link} className="promo-banner__link">
        {content}
      </Link>
    )
  }

  return content
}
