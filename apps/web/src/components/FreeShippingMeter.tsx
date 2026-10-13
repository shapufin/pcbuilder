import React from 'react'

interface FreeShippingMeterProps {
  currentTotalCents: number
  thresholdCents?: number
  className?: string
}

export function FreeShippingMeter({
  currentTotalCents,
  thresholdCents = 15000,
  className = '',
}: FreeShippingMeterProps) {
  if (thresholdCents <= 0) return null

  const remainingCents = Math.max(0, thresholdCents - currentTotalCents)
  const isUnlocked = remainingCents === 0
  const percent = Math.min(100, Math.max(0, Math.round((currentTotalCents / thresholdCents) * 100)))
  const remainingFormatted = (remainingCents / 100).toFixed(2)

  return (
    <div className={`free-shipping-meter ${isUnlocked ? 'free-shipping-meter--unlocked' : ''} ${className}`}>
      <div className="free-shipping-meter__header">
        {isUnlocked ? (
          <span className="free-shipping-meter__status">
            <span className="free-shipping-meter__icon" aria-hidden="true">🎉</span>
            <strong>FREE Express Shipping Unlocked!</strong>
          </span>
        ) : (
          <span className="free-shipping-meter__status">
            <span className="free-shipping-meter__icon" aria-hidden="true">🚚</span>
            Add <strong>€{remainingFormatted}</strong> more for <strong>FREE Shipping</strong>
          </span>
        )}
        <span className="free-shipping-meter__pct">{percent}%</span>
      </div>
      <div
        className="free-shipping-meter__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Free shipping progress"
      >
        <div
          className="free-shipping-meter__bar"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
