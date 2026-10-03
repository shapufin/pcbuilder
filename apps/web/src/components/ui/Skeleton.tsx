/**
 * Shimmer placeholder for loading.tsx boundaries. Dimensions are dynamic
 * by nature — pass style={{width, height}} (inline styles are allowed for
 * genuinely dynamic values).
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  className,
}: {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  className?: string
}) {
  return (
    <span
      className={className ? `skeleton ${className}` : 'skeleton'}
      aria-hidden="true"
      style={{ width, height, borderRadius }}
    />
  )
}
