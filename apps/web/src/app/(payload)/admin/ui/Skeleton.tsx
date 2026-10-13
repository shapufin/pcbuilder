import * as React from 'react'
import { clsx } from 'clsx'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  radius?: string | number
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, height, radius, style, ...props }, ref) => {
    const inlineStyle: React.CSSProperties = {
      ...style,
      ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
      ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
      ...(radius !== undefined ? { borderRadius: typeof radius === 'number' ? `${radius}px` : radius } : {}),
    }

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={clsx('bmr-skeleton', className)}
        style={inlineStyle}
        {...props}
      />
    )
  },
)

Skeleton.displayName = 'Skeleton'
