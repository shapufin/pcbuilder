'use client'

import * as React from 'react'
import { clsx } from 'clsx'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const [visible, setVisible] = React.useState(false)

  return (
    <div
      className="bmr-tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div role="tooltip" className={clsx('bmr-tooltip', className)}>
          {content}
          <div className="bmr-tooltip__arrow" />
        </div>
      )}
    </div>
  )
}
